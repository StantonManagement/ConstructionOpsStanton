# Construction Operations Center - Phase 4 Implementation Guide
## Advanced Field Operations & Performance Tracking - Cursor AI Instructions

---

## Project Context

**Building Upon**: Phase 3 delivered portfolio budget tracking, change order management, entity management, and financial dashboards. Phase 4 adds field-focused features for daily operations, quality control, and long-term asset management.

**Key Focus**: Enable Dean (field manager) to capture issues in real-time, track quality/performance, and manage project timelines while on-site using mobile devices.

**Technology Stack**: Next.js 15 + Supabase + Tailwind CSS (web) + React Native considerations for future native mobile app.

---

## Phase 4 Overview: Five Core Features

1. **Punch List Management** - Track deficiencies, assign to contractors, verify completion
2. **Photo Documentation Workflow** - Before/after photos with GPS/timestamp, linked to work items
3. **Timeline/Schedule Tracking** - Gantt charts, milestones, critical path analysis
4. **Contractor Performance Scoring** - Rate contractors, track metrics, identify top performers
5. **Warranty Tracking** - Log warranties, expiration reminders, claims management

---

## Feature 1: Punch List Management

### What Problem Does This Solve?

**Current Pain**: Dean walks properties, finds issues (chipped paint, loose outlets, missing trim), tells contractors verbally or via text. Issues get forgotten. No tracking of what's complete vs pending. Final inspections become firefights.

**After Implementation**: Dean uses tablet/phone to log issues on the spot. Photos attached. Assigned to contractor. Tracks status. Gets notifications when marked complete. Can verify before final sign-off. Nothing falls through cracks.

### Database Schema Requirements

**New Tables Needed**:

1. **punch_list_items** - Main deficiency records
   - Links: `project_id`, `unit_id` (optional), `contractor_id`, `category_id`
   - Identity: `item_number` (auto-generated per project: "P-001", "P-002")
   - Details: `description`, `location`, `trade_category`, `severity`
   - Status: `open`, `in_progress`, `completed`, `verified`, `rejected`
   - Timestamps: `created_date`, `due_date`, `completed_date`, `verified_date`
   - People: `created_by`, `assigned_to`, `completed_by`, `verified_by`
   - Photos: Array of photo URLs or separate table link

2. **punch_list_categories** - Trade categories
   - Standard categories: Electrical, Plumbing, HVAC, Drywall, Paint, Flooring, Carpentry, Exterior, Landscaping, General
   - Custom categories allowed
   - Links to icon/color for UI display

3. **punch_list_photos** - Supporting documentation
   - Links to: `punch_item_id`
   - Fields: `photo_url`, `caption`, `photo_type` (before/after/in_progress)
   - Metadata: `gps_latitude`, `gps_longitude`, `timestamp`
   - Device info: `device_type`, `uploaded_by`

4. **punch_list_comments** - Communication thread
   - Links to: `punch_item_id`
   - Fields: `comment_text`, `author_id`, `timestamp`
   - Attachments: optional file URLs
   - Notifications: trigger alerts to assigned contractor

### Workflow Logic to Implement

**Status Transitions**:
```
OPEN → (contractor accepts) → IN_PROGRESS
IN_PROGRESS → (contractor marks done) → COMPLETED
COMPLETED → (field manager verifies) → VERIFIED
COMPLETED → (field manager rejects) → REJECTED → IN_PROGRESS
VERIFIED = Final state (item closed)
```

**Assignment Rules**:
- Auto-assign based on trade category (if contractor/trade mapping exists)
- Manual assignment override allowed
- Can assign to multiple contractors for complex items
- Notification sent on assignment

**Due Date Logic**:
- Default: 7 days from creation for standard items
- 3 days for "High" severity items
- 14 days for "Low" severity items
- Custom due date override allowed
- Overdue items flagged in red with alerts

**Severity Levels**:
- **Critical**: Blocks occupancy or creates safety hazard (red badge)
- **High**: Major quality issue, blocks final inspection (orange badge)
- **Medium**: Standard deficiency, should be fixed before close-out (yellow badge)
- **Low**: Minor cosmetic issue, nice-to-fix (gray badge)

### UI Components to Build

**Punch List Entry Form** (mobile-optimized):

Form fields:
- Project/Property selector (dropdown with search, shows recent properties first)
- Unit number (text input, optional, for multi-unit properties)
- Location within unit (dropdown + text: Kitchen, Bathroom 1, Bedroom 2, Living Room, Hallway, Exterior, Other)
- Category (dropdown with icons: Electrical ⚡, Plumbing 💧, Paint 🎨, etc.)
- Description (text area, 2-3 lines, voice-to-text support if mobile)
- Severity (radio buttons: Critical / High / Medium / Low with color indicators)
- Contractor assignment (dropdown, searchable, pre-filtered by trade if category selected)
- Due date (date picker, defaults based on severity)
- Photo upload (camera integration, multiple photos, before/after toggle)
- Voice notes (optional audio recording for detailed explanation)

Action buttons:
- "Save Draft" (gray, saves without notification)
- "Create & Notify Contractor" (blue, primary action, sends alert)

Mobile optimizations:
- Large touch targets (minimum 48x48px)
- Camera quick access (single tap to photo mode)
- GPS auto-capture on photo
- Works offline, syncs when connection restored
- Voice input for description field

**Punch List Overview** (main management page):

Layout sections:

1. **Summary Cards** (top row):
   - Total Open Items (count)
   - Items Due This Week (count, yellow if > 5)
   - Overdue Items (count, red if > 0)
   - Completed This Week (count, green)

2. **Filters & Search** (toolbar):
   - Search: by item number, description, location
   - Filter by: Project, Contractor, Category, Severity, Status
   - Sort by: Date, Due Date, Severity, Status
   - View modes: List, Kanban Board, By Location

3. **Items List/Grid**:
   - Card view with thumbnail photo
   - Shows: item number, description (truncated), status badge, severity, assigned contractor, due date
   - Click card → detail view
   - Swipe actions (mobile): Mark Complete, Reassign, Delete
   - Bulk actions: Reassign selected, Mark complete (batch)

4. **Kanban Board View** (alternative):
   - Columns: Open | In Progress | Completed | Verified
   - Drag-and-drop to change status
   - Color-coded by severity
   - Photo thumbnail on each card

**Punch List Detail View** (dedicated page/modal):

Layout sections:
- Header: Item number, status badge, severity indicator, project name
- Photo gallery: Before/after comparison slider, fullscreen view option
- Details panel: All form fields displayed
- Location info: If GPS available, show map pin
- Assignment: Current assignee with change button
- Status history: Timeline of status changes with who/when
- Comments section: Threaded discussion (like GitHub issues)
- Action buttons (role-dependent):
  - If open and user is manager: "Reassign", "Change Severity", "Delete"
  - If completed and user is manager: "Verify Complete", "Reject & Reopen"
  - If assigned to user: "Mark Complete", "Add Comment", "Upload Progress Photo"

**Dashboard Widget** (for main dashboard):
- "Punch List Items" panel
- Shows: count of open items, overdue count (red if > 0)
- Mini-list: Top 5 items by due date
- Quick actions: "Add Punch Item", "View All Items"
- Click widget → navigate to punch list overview

### Mobile App Considerations

**Critical for Mobile**:
- Camera integration: Direct access to device camera, no extra clicks
- GPS auto-capture: Automatically tag photos with location
- Offline mode: Store items locally, sync when online (use local storage/IndexedDB)
- Voice input: Speech-to-text for description field
- Push notifications: When item assigned, commented on, or marked complete
- Photo compression: Reduce file size before upload to save bandwidth

**React Native Components**:
- Use `react-native-camera` for camera access
- Use `@react-native-community/geolocation` for GPS
- Use `react-native-voice` for voice input
- Use `@react-native-community/netinfo` for offline detection
- Use `react-native-push-notification` for alerts

**Progressive Web App (PWA) Alternative**:
- If not building native app yet, make web app installable
- Use Service Workers for offline support
- Use browser `getUserMedia()` for camera access
- Use browser Geolocation API for GPS
- Web Push API for notifications
- localStorage for offline queue

### Implementation Steps for Cursor

**Step 1**: Database migrations
- Create punch_list_items, punch_list_categories, punch_list_photos, punch_list_comments tables
- Add indexes on project_id, contractor_id, status, due_date
- Seed standard categories (Electrical, Plumbing, etc.)

**Step 2**: Build API layer
- POST /api/punch-list (create item)
- GET /api/punch-list (list with filters)
- GET /api/punch-list/[id] (detail)
- PUT /api/punch-list/[id] (update)
- POST /api/punch-list/[id]/complete (mark complete)
- POST /api/punch-list/[id]/verify (verify completion)
- POST /api/punch-list/[id]/reject (reject and reopen)
- POST /api/punch-list/[id]/photos (upload photos)
- POST /api/punch-list/[id]/comments (add comment)
- GET /api/punch-list/categories (list categories)

**Step 3**: Build photo upload system
- Implement file upload to S3/Supabase Storage
- Image compression before upload
- GPS metadata extraction from EXIF
- Thumbnail generation
- Before/after comparison UI

**Step 4**: Build punch list form
- Mobile-friendly responsive form
- Camera integration (if PWA) or file upload
- Voice input support
- Offline draft saving
- Validation and error handling

**Step 5**: Build overview and list views
- Summary cards with metrics
- Filterable list with search
- Kanban board alternative view
- Bulk actions

**Step 6**: Build detail view
- Photo gallery with zoom
- Status timeline
- Comments thread
- Action buttons (role-based)

**Step 7**: Build dashboard widget
- Summary metrics
- Quick access to add/view items
- Integration with main dashboard

**Step 8**: Implement notifications
- Email notifications for assignments
- Push notifications (if mobile app)
- In-app notification center
- Daily digest of overdue items

**Step 9**: Testing
- Test offline mode and sync
- Test photo upload and GPS tagging
- Test status workflow transitions
- Test on actual mobile devices (tablets/phones)
- Load testing with 100+ items per project

---

## Feature 2: Photo Documentation Workflow

### What Problem Does This Solve?

**Current Pain**: Photos scattered across phones, text threads, emails. No organization. Can't find the "before" photo when showing "after". No proof of condition. Disputes arise later.

**After Implementation**: All photos organized by project/unit/category. Before/after linked. GPS-tagged. Timestamped. Searchable. Generate reports with photo documentation. Prove work was done correctly.

### Database Schema Requirements

**Extend Existing Tables**:

1. **photos** (new central table for all photos)
   - Links: `project_id`, `unit_id`, `punch_item_id`, `change_order_id`, `budget_line_id`
   - Metadata: `photo_url`, `thumbnail_url`, `caption`, `photo_type`
   - Location: `gps_latitude`, `gps_longitude`, `location_description`
   - Time: `timestamp`, `date_taken`
   - Device: `device_type`, `device_model`, `uploaded_by`
   - Organization: `tags` (array), `category`, `visibility` (public/internal/private)
   - Quality: `original_width`, `original_height`, `file_size`, `compressed_url`

2. **photo_collections** - Group related photos
   - Types: "Before/After", "Progress Series", "Damage Documentation", "Final Inspection"
   - Links: array of photo IDs
   - Metadata: `collection_name`, `collection_type`, `project_id`

3. **photo_annotations** - Mark up photos
   - Links to: `photo_id`
   - Annotation data: `x`, `y` coordinates, `annotation_type` (arrow/circle/text/measure)
   - Content: `annotation_text`, `color`
   - User: `created_by`, `timestamp`

### Workflow Logic to Implement

**Photo Types**:
- **Before**: Condition before work started
- **In Progress**: Work underway, specific milestones
- **After**: Completed work
- **Issue**: Problem/deficiency documentation
- **Inspection**: For official inspections
- **General**: Other documentation

**Auto-Linking Logic**:
- If photo taken while viewing project detail → link to project
- If photo taken while creating punch item → link to punch item
- If photo taken while viewing change order → link to change order
- User can manually re-link after upload

**Auto-Tagging**:
- Extract EXIF GPS → store latitude/longitude
- Extract EXIF timestamp → use as date_taken
- Extract EXIF device model → store device info
- OCR text in photo → add as searchable tags (future enhancement)

**Privacy & Sharing**:
- Public: Visible to contractors and clients (final work photos)
- Internal: Only Stanton team can see (internal documentation)
- Private: Only uploader can see (personal notes)

### UI Components to Build

**Photo Capture Interface** (mobile-first):

Quick capture mode:
- Full-screen camera view
- Minimal UI (camera button, switch camera, flash toggle)
- Tap to capture, automatic upload
- Context-aware: knows what project/item you're viewing
- Batch mode: Take multiple photos rapidly, review/tag after
- Grid overlay: Help frame shots consistently
- Voice annotation: Say caption while taking photo

**Photo Gallery View** (organized browsing):

View modes:
- Timeline view: Chronological grid of all photos
- By project: Gallery per project with filters
- By category: Electrical, Plumbing, etc.
- By type: Before/After pairs, Issues, Progress
- Map view: Photos plotted on map by GPS coordinates

Features:
- Lightbox: Full-screen view with swipe navigation
- Zoom/pan: Pinch to zoom on mobile
- Compare mode: Side-by-side before/after with slider
- Slideshow: Auto-play progress through photos
- Download: Original quality download option
- Share: Generate shareable link (with expiration)

**Photo Management**:
- Bulk actions: Select multiple photos, add tags, move to collection, delete
- Edit caption/tags after upload
- Annotate: Draw arrows, circles, add text to photos
- Link/unlink: Associate with different items
- Reorder: Drag to reorder within collection

**Before/After Comparison Tool**:
- Split-screen with slider control
- Automatic alignment (AI-assisted, optional)
- Side-by-side or overlay mode
- Export as single comparison image
- Add to reports with captions

**Photo Report Generator**:
- Select date range
- Select project/unit
- Select categories
- Auto-generate PDF report with photos
- Customizable layout: 1, 2, 4, or 6 photos per page
- Include captions and annotations
- Add cover page and notes section
- Email report or save to project documents

### Mobile App Considerations

**Camera Features**:
- Native camera integration (higher quality than web)
- Background upload: Continue using app while uploading
- Burst mode: Rapid-fire multiple shots
- Timer mode: Set 3/5/10 second delay
- HDR mode: Better lighting in difficult conditions
- Manual focus: Tap to focus on specific areas
- Flash control: Auto/on/off/torch

**Offline Support**:
- Queue photos for upload when offline
- Show upload progress and queue status
- Retry failed uploads automatically
- Compress images locally before upload
- Store low-res thumbnails for offline browsing

**Performance**:
- Image compression: Reduce 12MB photos to 2-3MB
- Progressive loading: Show low-res then high-res
- Lazy loading: Load images as user scrolls
- Thumbnail caching: Store thumbnails locally
- Pagination: Load 20-50 photos at a time

### Implementation Steps for Cursor

**Step 1**: Database migrations
- Create photos, photo_collections, photo_annotations tables
- Add indexes on project_id, timestamp, photo_type, GPS coordinates
- Set up foreign keys to existing tables

**Step 2**: Photo storage setup
- Configure Supabase Storage buckets (or AWS S3)
- Set up image optimization pipeline (sharp library)
- Generate thumbnails on upload (200px, 600px, original)
- Implement CDN for fast delivery

**Step 3**: Build upload API
- POST /api/photos/upload (multipart form data)
- Extract EXIF metadata (gps, timestamp, device)
- Compress and generate thumbnails
- Store in cloud storage
- Return URLs and photo ID

**Step 4**: Build photo CRUD API
- GET /api/photos (list with filters)
- GET /api/photos/[id] (detail)
- PUT /api/photos/[id] (update caption/tags)
- DELETE /api/photos/[id] (soft delete)
- POST /api/photos/[id]/annotations (add markup)
- GET /api/photos/collections (list collections)
- POST /api/photos/collections (create before/after pair)

**Step 5**: Build camera capture UI
- File upload input (web fallback)
- Camera API integration (if PWA)
- Drag-and-drop upload zone
- Batch upload progress indicator

**Step 6**: Build gallery views
- Grid layout with lazy loading
- Lightbox with keyboard navigation
- Before/after comparison component
- Map view with pins (Mapbox or Google Maps)

**Step 7**: Build photo management
- Bulk selection UI
- Tag editor
- Collection manager
- Annotation tool (canvas-based drawing)

**Step 8**: Build report generator
- PDF generation (jsPDF or Puppeteer)
- Customizable layouts
- Export and email functionality

**Step 9**: Testing
- Test image upload with large files
- Test GPS extraction from various devices
- Test thumbnail generation
- Test on slow networks (mobile 3G/4G)
- Load testing with thousands of photos

---

## Feature 3: Timeline/Schedule Tracking

### What Problem Does This Solve?

**Current Pain**: Project timelines in Zach's head or scattered Excel files. No visibility into critical path. Don't know if delays in electrical will push final inspection. Can't communicate realistic completion dates to stakeholders.

**After Implementation**: Visual timeline (Gantt chart) shows all tasks, dependencies, milestones. See critical path. Identify bottlenecks. Update progress in real-time. Forecast completion dates. Share timeline with contractors and stakeholders.

### Database Schema Requirements

**New Tables Needed**:

1. **project_schedules** - Timeline definitions
   - Links: `project_id`
   - Settings: `start_date`, `target_end_date`, `actual_end_date`
   - Metadata: `created_by`, `last_updated`, `baseline_saved_date`
   - Status: `on_track`, `at_risk`, `delayed`, `completed`

2. **schedule_tasks** - Individual work items
   - Links: `schedule_id`, `predecessor_task_id`, `contractor_id`, `category_id`
   - Identity: `task_number`, `task_name`
   - Timing: `start_date`, `end_date`, `duration_days`, `actual_start`, `actual_end`
   - Progress: `percent_complete`, `status`
   - Details: `description`, `notes`
   - Dependencies: `dependency_type` (finish-to-start, start-to-start, finish-to-finish)
   - Constraints: `must_start_on`, `must_finish_by`, `earliest_start`, `latest_finish`

3. **schedule_milestones** - Key checkpoints
   - Links: `schedule_id`
   - Details: `milestone_name`, `target_date`, `actual_date`, `status`
   - Type: `permit_approval`, `inspection`, `substantial_completion`, `final_completion`, `custom`
   - Notifications: `alert_days_before` (remind X days in advance)

4. **schedule_dependencies** - Task relationships
   - Links: `task_id`, `depends_on_task_id`
   - Type: `finish_to_start`, `start_to_start`, `finish_to_finish`, `start_to_finish`
   - Lag: `lag_days` (can be negative for lead time)

5. **schedule_baselines** - Saved snapshots for comparison
   - Links: `schedule_id`
   - Snapshot: JSON blob of all tasks/dates at time of baseline
   - Metadata: `baseline_date`, `baseline_name`, `created_by`
   - Purpose: Compare current vs original plan

### Workflow Logic to Implement

**Critical Path Calculation**:
- Automatically calculate based on dependencies
- Identify tasks with zero slack (critical path)
- Highlight in red on Gantt chart
- Show impact of delays: "1 day delay here = 1 day project delay"

**Progress Tracking**:
- Manual update: User sets % complete
- Auto-update from punch list: If all punch items for task complete, auto-set to 100%
- Auto-update from daily logs: If work reported on task, prompt for progress update
- Forecast: Based on current progress rate, estimate actual completion date

**Slack/Float Calculation**:
- Early start/finish: Earliest task can start/finish based on predecessors
- Late start/finish: Latest task can start/finish without delaying project
- Total slack: Late finish - early finish
- Free slack: Time task can be delayed without delaying successors

**Resource Leveling** (future enhancement):
- Detect resource conflicts: Same contractor assigned to overlapping tasks
- Suggest adjustments to smooth workload
- Flag over-allocation

### UI Components to Build

**Timeline/Gantt Chart View** (primary interface):

Features:
- Horizontal timeline with tasks as bars
- Zoom levels: Day, week, month view
- Color coding: By contractor, by category, by status, by critical path
- Drag bars to reschedule (updates dates in database)
- Drag bar edges to change duration
- Click task → detail panel slides in
- Dependencies shown as arrows between tasks
- Milestones shown as diamonds
- Today line: Vertical line showing current date
- Baseline comparison: Ghost bars showing original plan vs current

Interactive elements:
- Hover task: Show tooltip with task name, dates, duration, contractor
- Click dependency arrow: Show lag/lead time, change dependency type
- Right-click task: Context menu (add predecessor, add successor, delete, mark complete)
- Double-click: Open task detail form

Mobile adaptations:
- Vertical timeline view (tasks stacked, not Gantt)
- Swipe to scroll timeline
- Tap task for details
- Simplified view (hide dependencies for clarity)

**Task List View** (alternative to Gantt):

Table columns:
- Task number/name (indented for sub-tasks)
- Start date
- End date
- Duration (days)
- Predecessors (task numbers, clickable)
- Assigned to (contractor)
- % Complete (with progress bar)
- Status (badge)

Features:
- Sort by any column
- Filter: By contractor, by status, by date range, critical path only
- Inline editing: Click cell to edit date/duration/assignment
- Bulk actions: Mark selected tasks complete, reassign, reschedule

**Task Detail Form**:

Fields:
- Task name (text input)
- Description (text area)
- Category (dropdown: Demo, Framing, Electrical, Plumbing, etc.)
- Assigned contractor (dropdown)
- Start date (date picker)
- End date (date picker, auto-calculates from start + duration)
- Duration (number input, in days)
- % Complete (slider 0-100%)
- Status (dropdown: Not Started, In Progress, Complete, On Hold)
- Predecessors (multi-select, shows task numbers and names)
- Dependency type (dropdown: Finish-to-Start is default)
- Lag time (number input, in days, can be negative)
- Notes (text area)

Action buttons:
- Save & Close
- Save & Add Another Task
- Delete Task
- Duplicate Task

**Milestones Panel**:

Display:
- List of milestones in chronological order
- Shows: name, target date, actual date (if achieved), status
- Countdown: "14 days until Rough Inspection"
- Warnings: "Permit Approval: 3 days overdue"

Actions:
- Add milestone
- Edit milestone
- Mark milestone achieved (sets actual date to today)
- Set reminder notifications

**Timeline Dashboard Widget**:

Shows:
- Project completion forecast date
- Critical path status: "On Track" or "X days behind"
- Upcoming milestone (next 7 days)
- Overdue tasks count (if any)
- Link to full timeline view

### Mobile App Considerations

**Mobile Challenges**:
- Gantt charts don't work well on small screens
- Use vertical timeline instead (list-based)
- Simplified task view (hide complexity)
- Focus on updates: Mark task complete, report progress
- Leave complex scheduling for desktop

**Mobile-Optimized Views**:
- Today's tasks: List of tasks starting or ongoing today
- My tasks: Tasks assigned to logged-in contractor
- Quick update: Swipe to mark task complete
- Voice update: "Task 5 is 50% complete, running 2 days behind"

**Notifications**:
- Task starting tomorrow: Reminder to contractor
- Task overdue: Alert to project manager
- Milestone approaching: Countdown notification
- Critical path delayed: Urgent alert

### Implementation Steps for Cursor

**Step 1**: Database migrations
- Create project_schedules, schedule_tasks, schedule_milestones, schedule_dependencies tables
- Add indexes on dates, project_id, contractor_id
- Create views for critical path calculation

**Step 2**: Build API layer
- POST /api/schedules (create project schedule)
- GET /api/schedules (list schedules)
- GET /api/schedules/[id] (get schedule with all tasks)
- PUT /api/schedules/[id]/tasks/[taskId] (update task)
- POST /api/schedules/[id]/tasks (add task)
- DELETE /api/schedules/[id]/tasks/[taskId] (delete task)
- GET /api/schedules/[id]/critical-path (calculate critical path)
- POST /api/schedules/[id]/baseline (save baseline snapshot)

**Step 3**: Build critical path calculator
- Server-side algorithm (not client-side for performance)
- Use topological sort for dependency ordering
- Calculate early/late start/finish dates
- Identify tasks with zero slack
- Return critical path task IDs

**Step 4**: Build Gantt chart component
- Use library: dhtmlxGantt, Frappe Gantt, or custom with D3.js
- Implement drag-to-reschedule
- Implement dependency arrows
- Implement zoom controls
- Make responsive (vertical timeline on mobile)

**Step 5**: Build task form and list view
- CRUD operations for tasks
- Dependency selector (multi-select with search)
- Date validation (end date after start date)
- Progress tracking

**Step 6**: Build milestone management
- CRUD for milestones
- Notification scheduling
- Status tracking

**Step 7**: Build dashboard widgets
- Schedule summary component
- Critical path status
- Upcoming milestones
- Integration with main dashboard

**Step 8**: Implement notifications
- Email/SMS for upcoming tasks
- Alerts for overdue tasks
- Milestone reminders

**Step 9**: Testing
- Test critical path calculation with complex dependencies
- Test rescheduling with drag-and-drop
- Test on mobile (vertical timeline)
- Load testing with 100+ task schedules

---

## Feature 4: Contractor Performance Scoring

### What Problem Does This Solve?

**Current Pain**: Dean and Zach have opinions about which contractors are good ("Mike's great, always on time" vs "ABC Electric is slow"). But it's subjective. Hard to justify not using someone or to prove someone is underperforming. No data.

**After Implementation**: Every contractor has a score based on objective metrics: on-time %, quality (punch list density), change order frequency, responsiveness. Can rank contractors. Make hiring decisions based on data. Show contractors their scores to incentivize improvement.

### Database Schema Requirements

**New Tables Needed**:

1. **contractor_scores** - Aggregate performance metrics
   - Links: `contractor_id`
   - Scores: `overall_score` (0-100), `quality_score`, `timeliness_score`, `cost_score`, `communication_score`
   - Metrics: `total_projects`, `completed_projects`, `on_time_percentage`, `avg_punch_items_per_project`
   - Flags: `is_preferred`, `is_approved`, `is_blocked`
   - Updated: `last_calculated`, `period_start`, `period_end`

2. **contractor_reviews** - Manual feedback
   - Links: `contractor_id`, `project_id`, `reviewer_id`
   - Ratings: `quality_rating` (1-5), `timeliness_rating`, `communication_rating`, `professionalism_rating`
   - Text: `review_text`, `strengths`, `areas_for_improvement`
   - Context: `review_date`, `would_hire_again` (boolean)

3. **contractor_metrics_history** - Time-series data
   - Links: `contractor_id`
   - Period: `month`, `year`
   - Metrics: JSON blob of all metrics for that period
   - Purpose: Track improvement/decline over time, generate trend charts

### Scoring Algorithm

**Overall Score Calculation** (weighted average):
```
Overall Score = (Quality × 40%) + (Timeliness × 30%) + (Cost × 20%) + (Communication × 10%)
```

**Quality Score Components**:
- Punch list density: Fewer punch items = higher score
  - Formula: `100 - (avg_punch_items_per_1000_sqft × 10)`
  - Cap at 0 minimum
- Punch item severity: Critical/High punch items weigh more negatively
- First-time completion rate: % of work that passes inspection first time
- Defect resolution time: How quickly punch items are fixed

**Timeliness Score Components**:
- On-time completion: % of tasks completed by scheduled end date
  - 100% on time = 100 points
  - 90% on time = 90 points, etc.
- Average delay: Avg days late across all tasks
  - 0 days = 100 points
  - 1 day avg delay = 95 points
  - 5 days avg delay = 75 points
  - 10+ days = 50 points
- Schedule impact: Did delays affect critical path?
  - Penalties for critical path delays

**Cost Score Components**:
- Change order frequency: Fewer change orders = better score
  - 0 COs = 100 points
  - 1-2 COs per project = 90 points
  - 3-4 COs = 80 points
  - 5+ COs = 70 points
- Change order justification: Hidden conditions (acceptable) vs poor planning (penalty)
- Budget adherence: Actual cost vs original bid
  - At/under budget = 100 points
  - 1-5% over = 90 points
  - 5-10% over = 80 points
  - 10%+ over = 70 points

**Communication Score Components**:
- Response time: How quickly contractor responds to messages/calls
  - < 1 hour = 100 points
  - < 4 hours = 90 points
  - < 24 hours = 80 points
  - > 24 hours = 60 points
- Daily log compliance: % of days with submitted logs (if required)
- Change order documentation: Are COs well-documented with photos/justification?

### UI Components to Build

**Contractor Scorecard** (individual contractor view):

Layout sections:

1. **Hero Section**:
   - Contractor name and company
   - Overall score: Big number (0-100) with color coding
     - 90-100: Green (Excellent)
     - 80-89: Light green (Good)
     - 70-79: Yellow (Satisfactory)
     - 60-69: Orange (Needs Improvement)
     - < 60: Red (Poor)
   - Badge: "Preferred Vendor" or "Approved" or "Probation" based on score
   - Contact info
   - Photo (optional)

2. **Score Breakdown**:
   - 4 sub-scores with progress circles or bars:
     - Quality: 85/100 🏆
     - Timeliness: 92/100 ⏰
     - Cost: 78/100 💰
     - Communication: 88/100 💬
   - Click each to see detailed metrics

3. **Key Metrics**:
   - Total projects completed
   - On-time completion rate (%)
   - Average punch items per project
   - Average response time
   - Change orders per project
   - Would hire again: X% of reviewers say yes

4. **Trend Chart**:
   - Line graph showing score over time (last 6-12 months)
   - Identify: Improving, declining, or stable

5. **Recent Projects**:
   - Table of last 5 projects with this contractor
   - Columns: Project, Date, On Time?, Punch Items, Rating
   - Click row → project detail

6. **Reviews**:
   - List of manual reviews from project managers
   - Shows: reviewer name, date, star ratings, comments
   - Filter: Only show recent (last 12 months)

**Contractor Leaderboard** (rankings view):

Display:
- Table of all contractors sorted by overall score (descending)
- Columns:
  - Rank (#1, #2, #3 with trophy icons for top 3)
  - Contractor name
  - Overall score (with progress bar)
  - Quality, Timeliness, Cost, Communication scores
  - Projects completed
  - Badge (Preferred/Approved/Probation)

Features:
- Sort by any column
- Filter by trade category (Electrical, Plumbing, etc.)
- Filter by badge status
- Search by contractor name
- Pagination (20 per page)
- Export to Excel

Actions:
- Click row → contractor scorecard
- Mark as preferred vendor
- Add manual review
- View projects with this contractor

**Contractor Review Form**:

Fields:
- Project (dropdown, auto-fill if coming from project detail)
- Contractor (dropdown or auto-filled)
- Quality rating (1-5 stars)
- Timeliness rating (1-5 stars)
- Communication rating (1-5 stars)
- Professionalism rating (1-5 stars)
- Review text (text area, optional)
- Strengths (text area, optional)
- Areas for improvement (text area, optional)
- Would hire again? (Yes/No toggle)
- Make review public to contractor? (checkbox)

Action buttons:
- Submit review
- Save draft
- Cancel

**Dashboard Widget**:

Shows:
- Top 3 contractors (by score) with small profile cards
- Worst performer alert (if any contractor < 60 score)
- Recent reviews: Last 2-3 reviews submitted
- Link to full leaderboard

### Mobile App Considerations

**Mobile-Specific Features**:
- Quick rate: After marking task complete, prompt to rate contractor
- Voice review: Record verbal feedback, transcribe to text
- Photo evidence: Attach photos to review (good or bad work)
- Push notification: When your score updates (if contractor has app access)

**Contractor-Facing Mobile View** (optional):
- Allow contractors to see their own scores
- Show feedback from project managers
- Track improvement over time
- Accept/dispute reviews (with appeals process)

### Implementation Steps for Cursor

**Step 1**: Database migrations
- Create contractor_scores, contractor_reviews, contractor_metrics_history tables
- Add indexes on contractor_id, scores, dates

**Step 2**: Build scoring calculation engine
- Server-side function to calculate all scores
- Pull data from projects, tasks, punch lists, change orders
- Weight components according to formula
- Store in contractor_scores table

**Step 3**: Build API layer
- GET /api/contractors/[id]/scorecard (get full scorecard)
- POST /api/contractors/[id]/reviews (submit review)
- GET /api/contractors/leaderboard (rankings)
- POST /api/contractors/[id]/recalculate (admin: force recalc)
- GET /api/contractors/[id]/metrics-history (time series)

**Step 4**: Build scorecard component
- Hero section with overall score
- Score breakdown with sub-scores
- Metrics cards
- Trend chart (use Recharts)
- Recent projects table
- Reviews section

**Step 5**: Build leaderboard view
- Sortable table
- Filtering and search
- Pagination
- Export functionality

**Step 6**: Build review form
- Star rating components
- Text inputs
- Validation
- Submit handler

**Step 7**: Build dashboard widget
- Top contractors display
- Recent reviews
- Integration with main dashboard

**Step 8**: Scheduled score recalculation
- Cron job: Run nightly to update all scores
- Or: Trigger recalculation on project completion
- Or: Real-time update on certain events (punch item closed, task completed)

**Step 9**: Testing
- Test scoring algorithm with various scenarios
- Test edge cases (contractor with 1 project vs 50 projects)
- Test trend charts with historical data
- Verify leaderboard sorting and filtering

---

## Feature 5: Warranty Tracking

### What Problem Does This Solve?

**Current Pain**: Contractors provide warranties (1 year labor, 10 year materials, etc.). No tracking. Warranty expires. Discover issue 1 week after expiration. Can't make claim. Lose money. Or: Have warranty but forgot about it.

**After Implementation**: Log all warranties when work is completed. Set expiration reminders. Get alerts 30/60/90 days before expiration. Track claims. Know what's still under warranty. Save money by using warranties instead of paying out of pocket.

### Database Schema Requirements

**New Tables Needed**:

1. **warranties** - Warranty records
   - Links: `project_id`, `unit_id`, `contractor_id`, `task_id`
   - Coverage: `warranty_type`, `coverage_description`, `covered_items`
   - Terms: `start_date`, `end_date`, `duration_months`, `status`
   - Documents: `warranty_document_url`, `receipt_url`, `terms_pdf_url`
   - Notifications: `reminder_30_days`, `reminder_60_days`, `reminder_90_days` (boolean flags)
   - Details: `exclusions`, `claim_process`, `notes`

2. **warranty_types** - Standard warranty categories
   - Examples: "1 Year Labor", "5 Year Materials", "10 Year Manufacturer", "Lifetime"
   - Standard durations
   - Standard exclusions

3. **warranty_claims** - Claims made against warranties
   - Links: `warranty_id`, `punch_item_id` (if related)
   - Claim: `claim_date`, `issue_description`, `claim_amount`, `status`
   - Process: `submitted_to_contractor_date`, `contractor_response`, `resolution_date`
   - Outcome: `claim_approved`, `amount_recovered`, `resolution_notes`
   - Photos: `evidence_photo_urls` (array)

4. **warranty_reminders** - Notification log
   - Links: `warranty_id`
   - Reminder: `reminder_date`, `days_before_expiration`, `sent_date`, `recipient_email`
   - Status: `sent`, `opened`, `acknowledged`

### Warranty Lifecycle

**Status Flow**:
```
PENDING → (work complete) → ACTIVE → (expiration) → EXPIRED
ACTIVE → (claim filed) → CLAIM_IN_PROGRESS → RESOLVED or EXPIRED
```

**Reminder Schedule**:
- 90 days before expiration: First alert (info level)
- 60 days before expiration: Second alert (warning level)
- 30 days before expiration: Final alert (critical level)
- On expiration date: Mark as expired, final notification
- Optional: Weekly digest of all warranties expiring in next 30 days

**Claim Process**:
1. Issue discovered on property
2. Check if under warranty (system flags if warranty exists)
3. File claim: Link to warranty, describe issue, attach photos
4. Notify contractor (email/SMS with claim details)
5. Contractor responds: Accept/dispute
6. Resolution: Contractor fixes issue or provides reimbursement
7. Close claim: Record outcome (approved/denied, amount recovered)

### UI Components to Build

**Warranty Entry Form** (simple):

Fields:
- Project/Property (dropdown)
- Unit (text input, optional)
- Contractor (dropdown)
- Related task (dropdown, optional, links to schedule task if applicable)
- Warranty type (dropdown: 1 Year Labor, 5 Year Materials, etc.)
- Coverage description (text area: what's covered)
- Start date (date picker, defaults to task completion date)
- Duration (number input + unit: months/years)
- End date (auto-calculated from start + duration)
- Upload warranty document (PDF/photo of warranty certificate)
- Upload receipt (optional)
- Exclusions (text area: what's NOT covered)
- Claim process (text area: how to make a claim, phone number, etc.)
- Notes (text area)

Action buttons:
- Save warranty
- Save & Add Another
- Cancel

**Warranty Dashboard** (overview):

Layout sections:

1. **Summary Cards**:
   - Active warranties (count)
   - Expiring soon (next 90 days, count)
   - Expired in last 30 days (count)
   - Total claims filed (count)
   - Total recovered from claims ($)

2. **Expiring Soon List**:
   - Table of warranties expiring in next 90 days
   - Sorted by expiration date (soonest first)
   - Columns: Property, Contractor, Warranty Type, Expires In, Actions
   - Color coding: < 30 days = red, 30-60 days = orange, 60-90 days = yellow
   - Actions: "File Claim", "Extend Warranty", "Mark Expired"

3. **Active Warranties Grid**:
   - Card view or table view toggle
   - Card shows: Property name, contractor, warranty type, expiration date
   - Click card → warranty detail
   - Filter: By property, by contractor, by warranty type, expiring soon
   - Sort: By expiration date, by property name, by contractor

4. **Claims Section**:
   - List of recent claims
   - Status badges: Pending, In Progress, Resolved, Denied
   - Click claim → claim detail

**Warranty Detail View**:

Layout:
- Header: Warranty ID, status badge, property name, contractor
- Coverage info: Warranty type, start date, end date, days remaining
- Covered items: What's included
- Exclusions: What's not included
- Documents: Links to warranty certificate, receipt, terms PDF
- Claim process: Instructions for filing claim
- Related task: Link to schedule task (if applicable)
- Reminders sent: Log of notifications
- Actions:
  - "File Claim" button (if active)
  - "Extend Warranty" (if near expiration, opens form to add new warranty)
  - "Edit" (update details)
  - "Delete" (soft delete)

**Claim Filing Form**:

Fields:
- Warranty (dropdown or auto-filled)
- Issue description (text area: what's the problem?)
- Claim amount (number input: estimated cost to fix)
- Upload photos (evidence of issue)
- Date issue discovered (date picker)
- Urgency (dropdown: Low/Medium/High/Emergency)
- Preferred resolution (text: repair, replace, reimbursement)

Auto-populated:
- Contractor contact info
- Warranty claim process instructions
- Coverage details

Action buttons:
- Submit claim (sends notification to contractor)
- Save draft
- Cancel

**Claim Detail View**:

Layout:
- Header: Claim ID, status, property, contractor, date filed
- Issue section: Description, photos, claim amount
- Timeline: Status history (filed, contractor notified, response received, resolved)
- Contractor response: Text response, acceptance/dispute
- Resolution: If resolved, show outcome (approved/denied, amount recovered, repair completed date)
- Actions:
  - "Update Status" (for admins)
  - "Mark Resolved" (close claim)
  - "Add Note" (communication thread)
  - "Upload Additional Evidence"

**Dashboard Widget**:

Shows:
- Warranties expiring in next 30 days (count, red if > 0)
- Recent claims (last 2-3)
- Quick action: "Add Warranty" button
- Link to full warranty dashboard

### Mobile App Considerations

**Mobile-Specific Features**:
- Scan warranty certificate: Use camera to scan and OCR extract details
- Quick log: Photo of warranty document → auto-extract dates and create record
- Photo claim: Take photos of issue → auto-link to warranty → file claim
- Push notifications: 30 days before expiration reminder

**Offline Support**:
- Download warranty PDFs for offline viewing
- Queue claim submissions when offline, sync when online

### Implementation Steps for Cursor

**Step 1**: Database migrations
- Create warranties, warranty_types, warranty_claims, warranty_reminders tables
- Add indexes on end_date, status, contractor_id, project_id
- Seed standard warranty types

**Step 2**: Build API layer
- POST /api/warranties (create warranty)
- GET /api/warranties (list with filters)
- GET /api/warranties/[id] (detail)
- PUT /api/warranties/[id] (update)
- DELETE /api/warranties/[id] (soft delete)
- GET /api/warranties/expiring-soon (next 90 days)
- POST /api/warranties/[id]/claims (file claim)
- GET /api/warranties/[id]/claims (list claims for warranty)
- PUT /api/warranties/claims/[claimId] (update claim status)

**Step 3**: Build warranty entry form
- Form with all fields
- Date calculations (end date from start + duration)
- File upload for documents
- Validation

**Step 4**: Build warranty dashboard
- Summary cards with metrics
- Expiring soon list with color coding
- Active warranties grid with filtering
- Claims section

**Step 5**: Build warranty detail view
- All warranty information
- Documents section
- Claim process display
- Action buttons

**Step 6**: Build claim filing form
- Issue description with photo upload
- Auto-populate contractor contact
- Submit handler

**Step 7**: Build claim detail view
- Status timeline
- Resolution tracking
- Communication thread

**Step 8**: Build reminder system
- Cron job: Run daily to check for warranties approaching expiration
- Send email/SMS reminders at 90/60/30 day marks
- Log reminders in warranty_reminders table
- Weekly digest option

**Step 9**: Build dashboard widget
- Expiring soon count
- Recent claims display
- Integration with main dashboard

**Step 10**: Testing
- Test expiration date calculations
- Test reminder scheduling (mock dates to test)
- Test claim workflow from start to finish
- Verify email/SMS notifications send correctly

---

## Integration Strategy

### How Phase 4 Features Work Together

**Punch List → Photos**:
- When creating punch item, attach photos
- Photos auto-linked to punch item
- Before/after photos tracked (before opening, after completion)

**Punch List → Schedule**:
- Punch items can block schedule tasks
- If task marked complete but punch items exist, flag as "Pending Punch"
- Punch completion required before task truly complete

**Punch List → Contractor Score**:
- Punch item density feeds into quality score
- Time to resolve punch items affects responsiveness score

**Photos → Warranties**:
- Attach warranty certificate photos when creating warranty
- Attach issue photos when filing warranty claim
- Before/after photos for claim evidence

**Schedule → Contractor Score**:
- On-time task completion feeds into timeliness score
- Schedule delays attributed to contractor

**Schedule → Warranties**:
- Task completion date = warranty start date
- Link warranty to schedule task

**Contractor Score → All Features**:
- Aggregates data from projects, tasks, punch lists, change orders, photos, reviews
- Comprehensive performance view

### Cross-Feature Data Flow

```
Project Created
  ↓
Schedule Built (tasks, dependencies, milestones)
  ↓
Tasks Assigned to Contractors
  ↓
Work Starts → Daily Logs/Photos Captured
  ↓
Task Completed → Punch List Items Created
  ↓
Punch Items Resolved → Photos Attached (Before/After)
  ↓
Task Verified Complete → Warranty Logged
  ↓
All Tasks Complete → Contractor Reviewed/Scored
  ↓
Project Closed → Historical Metrics Saved
```

---

## Mobile App Architecture

### Progressive Web App (PWA) vs Native App

**Phase 4A: PWA Enhancements** (immediate):
- Make existing web app installable (manifest.json)
- Add Service Workers for offline support
- Camera API for photo capture
- Geolocation API for GPS tagging
- Web Push API for notifications
- localStorage for offline data queue

**Phase 4B: React Native App** (future):
- Shared codebase with web (use React Native Web)
- Native camera integration (better quality)
- Native notifications (more reliable)
- Offline-first architecture (SQLite local database)
- Background sync
- App Store and Play Store distribution

### PWA Implementation (Immediate Priority)

**manifest.json** (make app installable):
```json
{
  "name": "ConstructionOps",
  "short_name": "ConstructionOps",
  "description": "Construction Management System",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3B82F6",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Service Worker** (offline support):
- Cache static assets (CSS, JS, images, fonts)
- Cache API responses with stale-while-revalidate strategy
- Queue failed requests for retry when online
- Show offline indicator in UI

**Camera Integration**:
```javascript
// Use browser getUserMedia API
navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
  .then(stream => {
    video.srcObject = stream;
    // Capture frame from video stream
    // Convert to blob and upload
  });
```

**Geolocation**:
```javascript
navigator.geolocation.getCurrentPosition(position => {
  const { latitude, longitude } = position.coords;
  // Attach to photo metadata
});
```

**Push Notifications**:
```javascript
// Request permission
Notification.requestPermission().then(permission => {
  if (permission === 'granted') {
    // Register service worker push
    // Subscribe to push notifications
  }
});
```

### React Native Architecture (Future)

**Folder Structure**:
```
/mobile
  /src
    /screens (one per main view)
    /components (reusable UI)
    /navigation (React Navigation)
    /api (shared with web)
    /hooks (shared with web)
    /utils (shared with web)
  /ios
  /android
```

**Key Libraries**:
- `react-native-camera` - Native camera access
- `@react-native-community/geolocation` - GPS
- `react-native-voice` - Voice input
- `@react-native-community/netinfo` - Network status
- `react-native-push-notification` - Notifications
- `react-native-fs` - File system access
- `react-native-sqlite-storage` - Local database

**Offline-First Strategy**:
- Use SQLite for local data storage
- Sync engine: Queue operations, sync when online
- Conflict resolution: Last-write-wins or manual merge
- Optimistic UI: Show updates immediately, rollback on error

---

## Implementation Timeline

### Phase 4A: Core Features (8-10 weeks)

**Weeks 1-2: Punch List Management**
- Database migrations
- API endpoints
- Punch list form and list views
- Photo upload integration
- Mobile optimizations

**Weeks 3-4: Photo Documentation**
- Photo storage setup
- Gallery views
- Before/after comparison
- Annotation tools
- Report generator

**Weeks 5-6: Timeline/Schedule Tracking**
- Database migrations
- Gantt chart component
- Task management
- Critical path calculation
- Milestone tracking

**Weeks 7-8: Contractor Performance Scoring**
- Scoring algorithm
- Scorecard UI
- Leaderboard
- Review system
- Automated score calculation

**Weeks 9-10: Warranty Tracking**
- Database migrations
- Warranty entry and dashboard
- Claim filing system
- Reminder notifications
- Integration testing

### Phase 4B: Mobile Enhancements (4-6 weeks)

**Weeks 11-12: PWA Setup**
- manifest.json and icons
- Service Worker implementation
- Camera API integration
- Offline support
- Push notifications

**Weeks 13-14: Mobile UI Refinements**
- Touch-optimized interfaces
- Gesture controls
- Vertical timeline view
- Quick actions
- Voice input

**Weeks 15-16: Testing & Polish**
- Cross-device testing (phones/tablets)
- Offline mode testing
- Performance optimization
- Bug fixes
- User acceptance testing

---

## Success Metrics

### Quantitative (Measurable)

**Punch List Adoption**:
- % of projects with active punch lists: Target 100%
- Average punch items per project: Benchmark then track reduction
- Punch resolution time: Target < 7 days average

**Photo Documentation**:
- Photos captured per project: Target 50+ per project
- Before/after pairs: Target 80% of tasks have photo documentation
- Time to capture and upload: Target < 30 seconds

**Schedule Tracking**:
- % of projects with schedules: Target 100% of active projects
- Schedule accuracy: Target actual vs planned within 10%
- Critical path awareness: PMs can identify critical path in < 30 seconds

**Contractor Performance**:
- Contractors with scores: Target 100% of active contractors
- Review completion rate: Target 80% of completed projects have contractor review
- Score-based decisions: Track hiring decisions influenced by scores

**Warranty Tracking**:
- Warranties logged: Target 100% of completed work
- Claims filed: Track count and recovery amount
- Expiration catch rate: Target 0 missed warranty expirations (all reminded)

### Qualitative (Observed)

**User Satisfaction**:
- Dean can log punch items without interrupting workflow
- Photos are organized and findable (not lost in camera roll)
- Zach can forecast project completion dates confidently
- Team makes contractor hiring decisions based on data
- No warranty expirations are missed

**Process Improvement**:
- Reduced final inspection punch list length (caught issues earlier)
- Faster project close-out (punch items tracked systematically)
- Better contractor accountability (transparency of performance data)
- Cost savings from warranty claims (previously lost money)

---

## Risk Mitigation

### Technical Risks

**Risk**: Mobile camera/GPS APIs don't work on all devices
**Mitigation**: Graceful degradation, file upload fallback, manual GPS entry option

**Risk**: Offline mode data loss
**Mitigation**: Comprehensive local storage, sync confirmation UI, error recovery

**Risk**: Gantt chart performance with 100+ tasks
**Mitigation**: Pagination, lazy loading, server-side critical path calculation

**Risk**: Scoring algorithm bias or inaccuracy
**Mitigation**: Iterative refinement based on user feedback, manual override option

### User Adoption Risks

**Risk**: Dean finds punch list entry too slow in field
**Mitigation**: Optimize for speed (voice input, camera quick access, minimal required fields)

**Risk**: Contractors react negatively to performance scores
**Mitigation**: Frame as improvement tool, show scores privately first, allow appeals

**Risk**: Schedule updates become burdensome
**Mitigation**: Auto-update from other systems (daily logs, punch list), minimize manual entry

### Business Risks

**Risk**: Historical data insufficient for accurate scoring
**Mitigation**: Start fresh, use manual reviews to supplement, improve over time

**Risk**: Warranty documents not available
**Mitigation**: Accept missing docs, focus on future projects, backfill opportunistically

**Risk**: Photo storage costs escalate
**Mitigation**: Image compression, resolution limits, archive old photos to cold storage

---

## Testing Strategy

### Unit Testing

**Backend**:
- Test critical path calculation algorithm (complex dependencies)
- Test scoring calculations (various scenarios)
- Test warranty expiration detection (date edge cases)
- Test photo EXIF extraction

**Frontend**:
- Test punch list filtering and sorting
- Test Gantt chart drag-and-drop
- Test before/after photo comparison
- Test offline queue and sync

### Integration Testing

**Workflows to Test**:
1. Create punch item → Upload photo → Assign contractor → Mark complete → Verify
2. Build schedule → Link dependencies → Drag task to reschedule → Verify dates update
3. Complete project → Submit review → Verify score updates
4. Log warranty → Wait for reminder (mock date) → File claim → Resolve
5. Take photo → Link to multiple entities (project, punch item, change order)

**Edge Cases**:
- Punch item without photos
- Schedule with circular dependencies (should reject)
- Contractor with 1 project vs 100 projects (score normalization)
- Warranty expiring today (edge of reminder window)
- Offline mode: Create 10 items, go online, verify all sync

### User Acceptance Testing

**Field Testing** (Critical):
- Dean uses punch list on tablet at actual job site
- Test in various conditions: bright sun, low light, cold weather (gloves)
- Test offline mode: Job sites with poor cell signal
- Measure: Can Dean log 5 punch items in < 5 minutes?

**Desktop Testing**:
- Zach views schedule and understands critical path
- Alex generates photo reports for client presentation
- Dean reviews contractor scores before hiring decision

**Acceptance Criteria**:
- Punch item creation: < 2 minutes (including photo)
- Photo upload: < 10 seconds on 4G
- Schedule understanding: PM can explain critical path in < 1 minute
- Contractor decision: Score influences hiring decision
- Warranty claim: Submitted within 24 hours of issue discovery

---

## Phase 5 Preview (Not in Current Scope)

**Next Phase Would Include**:
1. Native iOS/Android app (React Native)
2. RFI workflow (if working with architects)
3. Material/equipment inventory tracking
4. Tenant communication portal
5. Cash flow forecasting and budget projections

**Integration Opportunities**:
1. QuickBooks sync (automatic accounting entries)
2. AppFolio sync (rent roll, tenant data)
3. DocuSign integration (high-value change orders)
4. Slack/Teams bots (notifications and quick actions)

---

## Final Notes for Cursor Implementation

### Design Philosophy

- **Mobile-first, always**: Dean is in the field, not at a desk
- **Offline-capable**: Job sites have poor cell signal
- **Fast input**: Every second counts when documenting issues
- **Visual over textual**: Photos, charts, colors > walls of text
- **Proactive alerts**: Notify before problems (warranty expiring, task overdue)

### Development Best Practices

- **Incremental rollout**: Release one feature at a time, gather feedback, iterate
- **Feature flags**: Use feature toggles to enable/disable Phase 4 features during testing
- **Performance budgets**: Set thresholds (page load < 3s, photo upload < 10s)
- **Accessibility**: Ensure all features work with keyboard, screen readers, high contrast
- **Documentation**: Update user guide with each new feature

### Security & Privacy

- **Contractor data**: Performance scores are sensitive, restrict access (admin/PM only)
- **Photos**: Implement visibility controls (public/internal/private)
- **Warranties**: Encrypt sensitive data (tax IDs, account numbers if stored)
- **Audit logging**: Track who viewed/edited contractor scores
- **GDPR compliance**: If contractors can see own scores, ensure data export/deletion rights

### Monitoring & Analytics

- **Track feature usage**: Which features are used most? Least?
- **Performance monitoring**: Page load times, API response times, error rates
- **User behavior**: Where do users drop off? What causes frustration?
- **Business metrics**: Punch list density trending down? Warranty claims increasing?

---

**END OF PHASE 4 IMPLEMENTATION GUIDE**

This comprehensive guide provides all requirements for Cursor AI to implement Phase 4 features. Each feature is production-ready specification. Build incrementally, test thoroughly, and gather user feedback continuously.




