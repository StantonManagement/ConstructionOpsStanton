# Transcript Processing Tool - ClickUp Task List (Tasks 25-34)

**Epic Priority:** HIGH (Intelligence Layer / Automation)
**Epic Effort:** 35-50 hours total
**Source:** PRD Addendum G - Transcript Processing Tool
**Reference:** CONSOLIDATED_DASHBOARD_PRD.md (parent feature)
**Related:** TASK_2_CONSOLIDATED_DASHBOARD.md (Tasks 11-24)
**Date:** February 26, 2026

---

## Overview

The real priority shifts happen on calls. Dan gets on the phone with the team, inspector, or insurance company — and by the end, three things moved up, two got resolved, and one new emergency appeared. But none of that makes it into the system unless someone manually updates every item.

**The Problem:** The transcript is the richest signal we have for what changed. This tool reads the transcript, compares it to current dashboard state, and suggests updates — directly on the dashboard, inline, like track changes.

**The Goal:** After a 30-minute call, Dan pastes the transcript, reviews 10 suggestions in 30 seconds, accepts most, and the dashboard is up to date. No manual clicking through items.

**Note:** This epic builds on top of the Consolidated Dashboard (Tasks 11-24). The action items system must exist before this tool is useful.

---

## Task 25: Transcript Input UI

**Priority:** CRITICAL
**Effort:** 4-6 hours

### Problem
After a call, Dan needs a fast way to get the transcript into the system. Current workflow would require manually updating every action item that was discussed — could take 15-30 minutes. Transcript processing should feel lightweight, not like a "workflow with steps."

### Task
- [ ] Create transcript input page/modal accessible from dashboard
  - Route: `/dashboard/process-transcript` or modal overlay
  - Accessible via button in dashboard header: "Process Transcript" or document upload icon
- [ ] Implement two input methods:
  1. **Paste**: Large text area with placeholder "Paste transcript from Otter, Fireflies, Teams, or manual notes"
     - Auto-expands as text is pasted
     - Character count indicator
     - Works with any plain text format
  2. **Upload**: Drag-and-drop file picker
     - Accept formats: .txt, .pdf, .docx
     - Extract text content from uploaded files
     - Show file name and size after upload
     - Show loading state during extraction
- [ ] Add optional metadata fields (not required, but helpful):
  - **Who was on call**: Dropdown of team members + free text option
  - **Projects discussed**: Multi-select from active projects
  - **Call date**: Date picker (defaults to today)
  - Clearly label as "Optional — helps AI understand context"
- [ ] Add "Process" button (disabled until text is present)
- [ ] Show character/word count of transcript
- [ ] Handle very long transcripts (warn if >10,000 words: "This is a long transcript, processing may take 30-60 seconds")
- [ ] Mobile responsive: Works on phone for quick transcript paste from mobile transcription apps
- [ ] Save draft functionality: If user leaves before processing, ask to save draft

**Acceptance Criteria:**
- Can paste 5,000 word transcript and see it properly formatted
- Can upload .txt file and see content extracted
- Can click Process and trigger next step
- Works on mobile Safari and Chrome

---

##  

**Priority:** CRITICAL
**Effort:** 8-10 hours

### Problem
The AI needs to receive both the transcript text AND the current dashboard state, then intelligently match mentions in the transcript to existing action items, detect new items, and identify priority shifts. This requires structured input/output and careful prompt engineering.

### Task
- [ ] Create API endpoint: `POST /api/transcripts/process`
  - Accepts: transcript text, optional metadata (participants, projects, date)
  - Returns: structured suggestion list (JSON)
- [ ] Fetch current dashboard state to pass to AI:
  - All open action items (with all fields: id, title, priority, type, status, project, waiting_on, follow_up_date)
  - All active projects (id, name, type, phase, health)
  - Recently resolved items (last 7 days) - in case something comes back up
  - Format as structured JSON for AI context
- [ ] Integrate with LLM (OpenAI GPT-4 or Claude):
  - Construct prompt with:
    1. System instructions on suggestion categories (explicit actions, new items, priority shifts, questions, gaps)
    2. Current dashboard state JSON
    3. Transcript text
    4. Optional metadata
  - Request structured JSON response with suggestion format:
    ```json
    {
      "suggestions": [
        {
          "suggestion_type": "update_item" | "resolve_item" | "new_item" | "reprioritize" | "question" | "gap_flag",
          "target_item_id": 123,
          "target_project_id": 5,
          "confidence": "high" | "medium" | "low",
          "changes": {
            "priority": 2,
            "status": "in_progress",
            "waiting_on": "Inspector confirmed Thursday 2pm"
          },
          "reasoning": "One sentence explaining why",
          "transcript_excerpt": "Relevant quote from transcript",
          "question_text": "For category 4 - the question",
          "question_options": ["Option 1", "Option 2"]
        }
      ],
      "summary": "Processed X items, Y new suggestions, Z questions"
    }
    ```
- [ ] Implement AI behavior rules in prompt:
  - Match loosely: "The Buckingham thing" → "213 Buckingham retaining wall"
  - Prefer updating existing items over creating new ones
  - Don't duplicate suggestions
  - Flag ambiguity, don't guess
  - Quote transcript for every suggestion
  - Respect user's priority model (don't judge importance, interpret urgency)
  - Handle messy transcripts (crosstalk, fragments, tangents)
- [ ] Handle errors gracefully:
  - LLM timeout (retry once)
  - Invalid response format (return error to user)
  - Very short transcripts (<200 words) - process but warn "Partial transcript"
  - Rate limits (queue for processing)
- [ ] Store processed transcript:
  - Save transcript text to database
  - Link to processing session
  - Store metadata (date, participants, projects mentioned)
  - Store raw AI response for debugging
- [ ] Return processing results to frontend with:
  - Suggestion list
  - Summary stats
  - Any warnings (partial transcript, contradictions detected)

**AI Prompt Engineering Checklist:**
- [ ] Test with real call transcripts (5-10 examples)
- [ ] Verify loose matching works (nicknames, abbreviations)
- [ ] Verify no duplicate suggestions for same item
- [ ] Test ambiguous scenarios generate questions, not guesses
- [ ] Test time-based reasoning ("next week" vs "tomorrow")

---

##  

**Priority:** CRITICAL
**Effort:** 5-7 hours

### Problem
When transcript processing completes, the dashboard needs to enter a special "Review Mode" where suggestions appear inline on the items they affect. This isn't a separate page — it's the same dashboard with an overlay of proposed changes. Users need to see current state + suggested changes side by side.

### Task
- [ ] Create "Review Mode" state in dashboard context/store
  - State: `isReviewMode: boolean`, `suggestions: Suggestion[]`, `processingSessionId: number`
  - Enter Review Mode when transcript processing completes
  - Exit when all suggestions are reviewed or dismissed
- [ ] Add Review Mode banner at top of dashboard:
  - Styled as persistent header (yellow/amber background)
  - Shows: "Transcript processed — {N} suggestions to review"
  - Action buttons:
    - "Accept All" (primary button)
    - "Review One by One" (default selection)
    - "Dismiss All" (secondary, gray)
  - Progress indicator: "3 of 12 reviewed"
- [ ] Visual indicators for items with suggestions:
  - Add colored left border (orange/amber) to action item cards with pending suggestions
  - Add small badge: "1 suggestion" or "2 suggestions"
  - Slightly elevated/highlighted compared to other items
- [ ] Handle suggestion-to-item mapping:
  - Group suggestions by target_item_id
  - For new item suggestions, determine which priority tier to display in
  - Track which suggestions have been reviewed (accepted/dismissed)
- [ ] Keyboard navigation for Review Mode:
  - Tab/Shift+Tab: Navigate between suggestions
  - Enter: Accept current suggestion
  - Backspace/Delete: Dismiss current suggestion
  - Escape: Exit Review Mode (with confirmation if unreviewed suggestions)
- [ ] Mobile handling:
  - Stack banner buttons vertically
  - Make review actions large touch targets
  - Swipe left/right on suggestion to dismiss/accept (optional)

**Acceptance Criteria:**
- Dashboard enters Review Mode when suggestions load
- All items with suggestions are visually distinct
- Banner shows accurate count and updates as suggestions are reviewed
- Can exit Review Mode only when all reviewed or user confirms dismissal

---

## Task 28: Inline Suggestions - Update Existing Items

**Priority:** CRITICAL
**Effort:** 6-8 hours

### Problem
Users need to see suggested changes directly on the action item cards, styled like "track changes" in a document editor. Current state and suggested changes should be clearly differentiated so users can quickly decide to accept or dismiss.

### Task
- [ ] Design suggestion display format (track changes style):
  - **Priority change**: Show both badges side by side
    - Current: `[P3]` in current color
    - Arrow: `→`
    - Suggested: `[P1]` in suggested color (semi-transparent until accepted)
  - **Status change**: Show as diff text
    - `Status: open → in_progress` with strike-through on old, underline on new
  - **Field updates**: Show field name + diff
    - `Waiting on: ~~Inspector Mike~~ → Inspector confirmed Thursday 2pm`
  - **Resolve suggestion**: Show as action card
    - `Suggest: Resolve this item`
    - Show proposed resolution note in quotation marks
    - Preview what resolved state looks like
- [ ] Add suggestion panel to action item card:
  - Appears below main item content
  - Light background (cream/light yellow) to differentiate from item
  - Contains:
    - Suggestion changes (formatted as above)
    - Reasoning (one sentence from AI)
    - Transcript excerpt (in gray italics, max 200 chars)
    - Confidence level (small badge: "High confidence" / "Medium" / "Low")
  - Two primary action buttons:
    - **Accept** (green button) - applies changes immediately
    - **Dismiss** (gray button) - removes suggestion
  - Optional **Edit** button (tertiary) - opens edit mode before accepting
- [ ] Implement "Edit Before Accept" flow:
  - Click "Edit" makes suggestion fields editable inline
  - User can modify priority, status, waiting_on, follow_up_date, resolution note
  - "Save" applies edited version, "Cancel" returns to original suggestion
- [ ] Handle multiple suggestions on same item:
  - Stack suggestions vertically
  - User can accept/dismiss individually
  - If one suggestion is accepted, re-evaluate others (may become obsolete)
- [ ] Optimistic UI for Accept:
  - Apply changes to UI immediately
  - Show loading spinner on item
  - API call in background to persist
  - If API fails, revert and show error
- [ ] Track suggestion state per item:
  - Pending (not reviewed)
  - Accepted (applied)
  - Dismissed (ignored)
  - Edited (user modified before accepting)

**Visual Design Requirements:**
- Use color sparingly: green for accept, red for dismiss, amber for suggestion background
- Strike-through + arrow → pattern for changes
- Transcript excerpt in italics, max 2 lines with ellipsis
- Confidence badge subtle (small, gray)

---

## Task 29: Inline Suggestions - New Item Proposals

**Priority:** HIGH
**Effort:** 4-6 hours

### Problem
AI detects things mentioned in transcript that don't match any existing action item and suggests creating new ones. These new items need to appear in the priority list at their suggested tier but be clearly differentiated as "not yet created" until user accepts.

### Task
- [ ] Display new item suggestions in priority list:
  - Render as action item cards in their suggested priority tier
  - Visual distinction from real items:
    - Dashed border instead of solid
    - Slightly muted/faded background color
    - "Suggested" badge (small, yellow/amber)
    - Icon: document-plus or sparkle icon
- [ ] New item card shows:
  - Suggested title (editable inline)
  - Suggested project (dropdown to change)
  - Suggested priority (1-5 picker to change)
  - Suggested type (dropdown: emergency, blocker, waiting, etc.)
  - AI reasoning: "Why this was suggested"
  - Transcript excerpt: "Relevant quote"
  - Confidence level
- [ ] Interaction options:
  - **Accept**: Creates the item with suggested values
  - **Edit & Accept**: Opens full edit mode with all fields, then creates
  - **Dismiss**: Removes suggestion from list
- [ ] Edit mode for new items (before accepting):
  - All fields editable:
    - Title (text input)
    - Project (dropdown)
    - Priority (1-5 picker)
    - Type (dropdown)
    - Status (defaults to "open", can change)
    - Description (optional, text area)
    - Assigned to (optional, user picker)
    - Waiting on (optional, text)
    - Follow-up date (optional, date picker)
  - "Create" button saves to database
  - "Cancel" returns to suggestion preview
- [ ] After acceptance:
  - New item appears as real item in the list (solid border, full opacity)
  - Suggestion removed from pending list
  - Item gets database ID and behaves like manually-created item
- [ ] Batch accept for new items:
  - If user clicks "Accept All" in banner, all new item suggestions are created with default values
  - No edit step for batch accept

**Acceptance Criteria:**
- New item suggestions are visually distinct from real items
- Can edit all fields before accepting
- Accepted items become real action items immediately
- Position in list matches their priority tier

---

## Task 30: Clarifying Questions (Category 4)

**Priority:** HIGH
**Effort:** 5-7 hours

### Problem
When AI encounters ambiguous mentions in transcript ("The Buckingham thing is done" — action item resolved or entire project complete?), it should ask clarifying questions rather than guess wrong. Questions need interactive answer options that directly trigger the correct action.

### Task
- [ ] Create "Clarifying Questions" section:
  - Appears at top of dashboard, below Review Mode banner
  - Collapsible card with amber/yellow background
  - Header: "⚠️ {N} questions need your input"
  - Shows all Category 4 suggestions (where `suggestion_type === "question"`)
- [ ] Question card layout:
  - Question text (clear, concise, specific)
  - Transcript excerpt (the ambiguous part, in quotes and italics)
  - Context: "This was mentioned while discussing {project_name}"
  - Multiple choice answer buttons (2-4 options):
    - Each button clearly labeled with action it will take
    - Example: "Resolve the action item" / "Mark project complete" / "Neither — ignore"
  - Optional free text box: "Or explain what this means" (if user wants to provide more context)
- [ ] Question answer handling:
  - Click answer button triggers corresponding action immediately
  - If answer resolves an action item → same flow as accept resolve suggestion
  - If answer creates new item → same flow as accept new item suggestion
  - If answer updates priority → same flow as accept reprioritize suggestion
  - If answer is "ignore" → dismiss the question
- [ ] Free text answer (optional enhancement):
  - User types explanation
  - Send back to AI for reprocessing (mini-loop)
  - AI generates new suggestion based on clarification
  - Show new suggestion inline
- [ ] Track answered questions:
  - Once answered, question disappears from list
  - Update progress: "2 of 5 questions answered"
- [ ] Question types to support:
  - **Item vs Project**: "Does this refer to action item X or entire project Y?"
  - **Ambiguous reference**: "Which project/contractor is this about?" (provide options)
  - **Incomplete information**: "What should be done about X?" (open-ended)

**Example Questions UI:**
```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ 3 questions need your input                          │
├─────────────────────────────────────────────────────────┤
│ Question 1 of 3:                                        │
│ "The Buckingham thing is done"                          │
│                                                          │
│ Does this mean:                                         │
│ [Resolve action item: "Retaining wall bid responses"]  │
│ [Mark project "213 Buckingham" as complete]            │
│ [Neither — ignore this mention]                        │
│                                                          │
│ Context: 213 Buckingham retaining wall project has 1   │
│ open action item and is currently in Planning phase.   │
└─────────────────────────────────────────────────────────┘
```

---

## Task 31: Gap Flagging (Category 5) - Items Not Mentioned

**Priority:** MEDIUM
**Effort:** 3-4 hours

### Problem
If a Priority 3 action item wasn't mentioned in a 30-minute call, it might be stale or deprioritized. Users should be notified of these gaps — not as required actions, but as informational nudges to review.

### Task
- [ ] Implement gap detection logic:
  - AI identifies action items at P1-P3 that weren't referenced in transcript
  - Exclude items in `waiting` status (wouldn't discuss if waiting)
  - Exclude items updated in last 24 hours (may have been handled outside call)
  - Flag only if transcript is substantial (>500 words, >5 minute call)
- [ ] Display gap flags on action items:
  - Small muted badge on item card: "Not discussed on call"
  - Light gray color (not attention-grabbing like suggestions)
  - Icon: question mark or clock
- [ ] Click badge to see details:
  - Tooltip or popover: "This item is Priority {N} and wasn't mentioned in the transcript from today's call. Still relevant?"
  - Two options:
    - "Dismiss flag" (removes the badge)
    - "Review item" (expands item for editing)
- [ ] Gap flags don't block Review Mode completion:
  - User can exit Review Mode with unresolved gap flags
  - Gap flags persist on items until dismissed or item is updated
- [ ] Summary in Review Mode banner:
  - "{N} suggestions to review, {M} items not discussed"
  - Click count to jump to first flagged item

**Business Rules:**
- Only flag P1-P3 items (P4-P5 are acknowledged low priority)
- Don't flag items in `waiting` status
- Don't flag items updated in last 24 hours
- Don't flag if transcript is very short (<500 words)

**Acceptance Criteria:**
- P2 item not mentioned in substantial transcript gets flag
- P4 item not mentioned does NOT get flag
- Item in `waiting` status not mentioned does NOT get flag
- Flag is dismissible and doesn't reappear after dismissal

---

## Task 32: Batch Operations & Review Completion

**Priority:** HIGH
**Effort:** 4-5 hours

### Problem
If AI did a good job, user should be able to accept all suggestions in one click. If transcript was wrong call or garbage, dismiss all quickly. Review Mode needs clear completion state.

### Task
- [ ] Implement "Accept All" button:
  - In Review Mode banner
  - Primary green button
  - Confirmation modal: "Apply all {N} suggestions? This will update {X} items, create {Y} new items, and resolve {Z} items."
  - Show brief summary of what will change
  - Two buttons: "Accept All" (confirm), "Cancel" (keep reviewing)
  - After confirmation:
    - Apply all suggestions in sequence
    - Show loading state with progress: "Applying 5 of 12..."
    - If any fail, show which ones failed and allow retry
    - Success message: "All suggestions applied. Dashboard updated."
    - Exit Review Mode automatically
- [ ] Implement "Dismiss All" button:
  - In Review Mode banner
  - Secondary gray button
  - Confirmation modal: "Dismiss all suggestions? No changes will be made to the dashboard."
  - Simpler than Accept All (nothing to apply)
  - After confirmation:
    - Clear all suggestions
    - Exit Review Mode
    - Show toast: "Suggestions dismissed"
- [ ] Implement "Accept All in Category" (optional enhancement):
  - Advanced option in dropdown menu
  - "Accept all explicit actions" (Category 1)
  - "Accept all new items" (Category 2)
  - Useful if user trusts AI on some categories but wants to review others
- [ ] Review Mode completion logic:
  - Can exit when all suggestions are reviewed (accepted or dismissed)
  - If user tries to exit with unreviewed suggestions:
    - Confirmation modal: "{N} suggestions not reviewed. Exit anyway?"
    - Options: "Keep Reviewing" / "Dismiss Unreviewed" / "Accept Unreviewed"
  - After exit:
    - Save processing session log:
      - Date/time processed
      - Transcript text (stored in DB)
      - {N} suggestions generated
      - {X} accepted, {Y} dismissed, {Z} edited, {W} questions answered
    - Return dashboard to normal mode
    - Show success toast: "Transcript processed. {X} items updated."

**Acceptance Criteria:**
- Accept All applies all suggestions and exits Review Mode
- Dismiss All clears all suggestions and exits Review Mode
- Can't exit with unreviewed suggestions without confirmation
- Processing session is logged for history

---

## Task 33: Duplicate Detection & Transcript History

**Priority:** MEDIUM
**Effort:** 4-5 hours

### Problem
If user loads same transcript twice, system should detect duplicates and warn. Users should also be able to see history of past transcript processing sessions for audit trail.

### Task
- [ ] Implement duplicate transcript detection:
  - When transcript is submitted, calculate similarity score vs. recent transcripts (last 30 days)
  - Use fuzzy matching: Levenshtein distance or TF-IDF similarity
  - If similarity > 80%, show warning modal:
    - "This transcript appears similar to one processed on {date}."
    - Show preview of similar transcript (first 200 chars)
    - Options: "Process Anyway" / "Cancel"
  - If user proceeds, tag as "possible duplicate" in logs
- [ ] Create transcript history page/section:
  - Route: `/dashboard/transcript-history` or tab in dashboard
  - Shows list of past processing sessions (most recent first)
  - Each entry shows:
    - Date/time processed
    - Participants (if provided)
    - Projects discussed (if provided)
    - Transcript preview (first 100 chars)
    - Stats: {N} suggestions generated, {X} accepted, {Y} dismissed
    - Status: "Completed" / "Partially reviewed" / "Dismissed all"
  - Click entry to view details:
    - Full transcript text (read-only)
    - List of suggestions with their final state (accepted/dismissed/edited)
    - Which items were affected
    - Link to affected items (jump to item on dashboard)
- [ ] Store transcript data in database:
  - Table: `transcript_processing_sessions`
    - `id`, `transcript_text`, `processed_at`, `processed_by_user_id`
    - `participants`, `projects_discussed`, `call_date`
    - `suggestions_count`, `accepted_count`, `dismissed_count`, `edited_count`
    - `status` (completed, partial, dismissed_all)
    - `similarity_score` (if duplicate detected)
  - Table: `transcript_suggestions` (detail records)
    - `session_id`, `suggestion_type`, `target_item_id`, `changes` (JSON)
    - `final_state` (accepted, dismissed, edited)
    - `reasoning`, `transcript_excerpt`, `confidence`
- [ ] Implement search/filter in history:
  - Filter by date range
  - Filter by projects discussed
  - Search transcript text
  - Filter by status (completed/partial)

**Acceptance Criteria:**
- Loading duplicate transcript shows warning
- History page shows all past sessions with stats
- Can view full transcript and suggestion details for any session
- Search and filter work correctly

---

## Task 34: Testing & Edge Cases

**Priority:** CRITICAL
**Effort:** 5-7 hours

### Problem
Transcript processing is complex with many edge cases: messy transcripts, ambiguous references, contradictions, very long transcripts. Thorough testing ensures system handles real-world scenarios gracefully.

### Task

**Manual Test Scenarios:**

- [ ] **Test 1: Perfect transcript with clear matches**
  - Load transcript: "We need to call the inspector back, he confirmed Thursday at 2pm. The retaining wall bids came in, Mike's is the best at $4,200."
  - Expected: 2 suggestions (update inspector item, resolve bid item)
  - Verify: Matches correct items, shows transcript excerpts, reasoning clear
  - Accept all, verify dashboard updated correctly

- [ ] **Test 2: Messy transcript with fragments**
  - Load transcript with crosstalk: "So the, uh, what about the— yeah the Westland HVAC thing, right? We should probably... yeah."
  - Expected: AI should match "Westland HVAC" to correct project despite fragments
  - Verify: Doesn't crash, produces reasonable suggestions or question

- [ ] **Test 3: New items suggested**
  - Load transcript: "Oh and we need someone to look at the roof at 31 Park, there's some damage."
  - Expected: New item suggestion "Roof inspection at 31 Park"
  - Verify: Appears in correct priority tier, can edit before accepting

- [ ] **Test 4: Ambiguous references → questions**
  - Load transcript: "The Buckingham thing is done"
  - Expected: Clarifying question (resolve item or complete project?)
  - Verify: Question has clear options, clicking applies correct action

- [ ] **Test 5: Priority shifts**
  - Load transcript spending 10 minutes on item currently at P4
  - Expected: Suggest reprioritize to P2 or P3 with reasoning
  - Verify: Shows priority change (P4 → P2), reasoning mentions time spent

- [ ] **Test 6: Gap flagging**
  - Load 500-word transcript that doesn't mention P2 item
  - Expected: Gap flag on unmmentioned P2 item
  - Verify: Flag is subtle, dismissible, doesn't block completion

- [ ] **Test 7: Contradictory information**
  - Load transcript: "Inspector confirmed for Thursday... wait no, actually we're still waiting"
  - Expected: Use latest statement, note contradiction in reasoning
  - Verify: Suggestion reflects final state (still waiting)

- [ ] **Test 8: Very short transcript**
  - Load 50-word transcript
  - Expected: Process but warn "Partial transcript, suggestions may be incomplete"
  - Verify: Warning appears, suggestions still generated

- [ ] **Test 9: Very long transcript (10,000+ words)**
  - Load 2-hour meeting transcript
  - Expected: Takes 30-60 seconds to process, handles all mentions
  - Verify: No duplicates, no timeout errors, all suggestions appear

- [ ] **Test 10: Duplicate transcript**
  - Load same transcript twice
  - Expected: Warning "Appears similar to transcript from {date}"
  - Verify: Can proceed or cancel, duplicate tag in logs

- [ ] **Test 11: Batch operations**
  - Generate 15 suggestions, click "Accept All"
  - Expected: All applied in sequence, dashboard updates, Review Mode exits
  - Verify: Loading states, progress indicator, success message

- [ ] **Test 12: Editing suggestions**
  - Load suggestion, click "Edit", modify fields, accept
  - Expected: Modified version applied, tracked as "edited" in logs
  - Verify: Can cancel edit and return to original suggestion

- [ ] **Test 13: Multiple suggestions on same item**
  - Load transcript mentioning same item twice (priority change + status change)
  - Expected: Both suggestions appear stacked on item
  - Verify: Can accept/dismiss individually, no conflicts

- [ ] **Test 14: API errors**
  - Simulate LLM timeout
  - Expected: Retry once, then show error message to user
  - Verify: User can re-submit transcript

- [ ] **Test 15: Mobile experience**
  - Load transcript on mobile, review suggestions
  - Expected: Touch targets large, swipe gestures work (if implemented)
  - Verify: Can paste transcript, review, and accept/dismiss on phone

**Edge Case Checklist:**

- [ ] Transcript with no mentions of existing items → no suggestions (show message)
- [ ] Transcript mentioning project that doesn't exist → suggest new project + new item
- [ ] Item mentioned as both "done" and "still waiting" → use latest mention, flag contradiction
- [ ] User exits Review Mode mid-review → confirm unsaved suggestions
- [ ] Processing fails mid-way → partial suggestions shown, can retry
- [ ] Transcript in different language → AI should handle or return error
- [ ] Transcript with URLs/emails → don't break parsing
- [ ] Special characters in transcript (emoji, unicode) → handle gracefully

**Performance Testing:**

- [ ] 500-word transcript processes in <5 seconds
- [ ] 5,000-word transcript processes in <30 seconds
- [ ] 10,000-word transcript processes in <60 seconds
- [ ] Applying 20 suggestions completes in <10 seconds
- [ ] UI remains responsive during processing

**Integration Testing:**

- [ ] Accepted suggestions update action items correctly in database
- [ ] New items created from suggestions have correct RLS policies
- [ ] Resolved items move to resolved history
- [ ] Dashboard state updates match suggestion changes exactly
- [ ] Transcript history logs match actual processing results

---

## Dependencies & Order of Execution

### Must Complete First (Blocking):
1. **Tasks 11-24 (Consolidated Dashboard)** - Action items system must exist
2. **Task 12 specifically (Database Schema)** - Need action_items table
3. **Task 13 specifically (Priority List UI)** - Need dashboard to show suggestions on

### Recommended Build Order:
1. ✅ Task 25: Transcript Input UI (entry point)
2. ✅ Task 26: AI Processing Service (core intelligence)
3. ✅ Task 27: Review Mode Framework (infrastructure)
4. ✅ Task 28: Inline Suggestions - Updates (most common case)
5. ✅ Task 29: Inline Suggestions - New Items (second most common)
6. ⏭️ Task 32: Batch Operations (completes core workflow)
7. ⏭️ Task 30: Clarifying Questions (handles ambiguity)
8. ⏭️ Task 31: Gap Flagging (nice-to-have intelligence)
9. ⏭️ Task 33: Duplicate Detection & History (audit trail)
10. ⏭️ Task 34: Testing & Edge Cases (before production)

**Minimum Viable Feature (MVP):**
- Tasks 25, 26, 27, 28, 29, 32 = Core transcript processing with inline suggestions (28-38 hours)
- Can ship without questions, gap flagging, and history in Phase 1

---

## Total Estimated Effort

| Phase | Tasks | Hours |
|-------|-------|-------|
| **Core Processing** (MVP) | 25, 26, 27, 28, 29, 32 | 28-38 hours |
| **Intelligence** | 30, 31 | 8-11 hours |
| **Audit & History** | 33 | 4-5 hours |
| **Testing & QA** | 34 | 5-7 hours |
| **Total** | 10 tasks (25-34) | **45-61 hours** |

**Note:** Original PRD estimate was 35-50 hours. With full intelligence and history features, total is 45-61 hours. To hit lower estimate, ship Core Processing (MVP) first (28-38 hrs), then add Intelligence and History in Phase 2.

---

## Success Metrics

After deployment, measure:

1. **Usage frequency:** How often are transcripts processed? (Target: 2-3 times per week)
2. **Suggestion accuracy:** What % of suggestions are accepted vs. dismissed? (Target: >70% accepted)
3. **Time savings:** How long does transcript review take? (Target: <2 minutes for 10 suggestions)
4. **Item update rate:** Are more action items being updated after calls? (Target: 50% increase)
5. **Question accuracy:** How often do clarifying questions get answered vs. dismissed? (Target: >80% answered)
6. **User satisfaction:** Does Dan feel the tool saves time vs. manual updates? (Qualitative feedback)

**Target:** Dan processes transcripts within 5 minutes of ending calls, most suggestions accepted, dashboard stays current without manual effort.

---

## Reference Documents

- **Full PRD:** PRD Addendum G - Transcript Processing Tool
- **Parent Feature:** CONSOLIDATED_DASHBOARD_PRD.md (action items system)
- **Related Tasks:** TASK_2_CONSOLIDATED_DASHBOARD.md (Tasks 11-24)
- **Notification Service:** `src/lib/notificationService.ts` (may integrate for transcript processing alerts)

---

## Questions for Dan

Before starting development:

1. **Transcript sources:** Which transcription tools do you currently use? (Otter, Fireflies, Teams, manual notes?)
2. **Call frequency:** How many calls per week would generate transcripts? (Helps estimate API costs)
3. **Preferred workflow:** Process immediately after call, or batch at end of day?
4. **Confidence threshold:** How accurate do suggestions need to be before you trust them? (Affects prompt engineering)
5. **Question tolerance:** How many clarifying questions are acceptable before tool becomes annoying? (Max 3-5 per transcript?)
6. **History importance:** How often would you reference past transcripts? (Helps prioritize Task 33)

---

## Technical Considerations

### AI/LLM Integration

**Option 1: OpenAI GPT-4**
- Pros: Excellent at structured output, good reasoning, widely documented
- Cons: Higher cost ($0.03 per 1K tokens), rate limits
- Cost estimate: ~$0.50-2.00 per transcript (depending on length)

**Option 2: Anthropic Claude 3**
- Pros: Better at following complex instructions, cheaper ($0.015 per 1K tokens)
- Cons: Newer API, less community examples
- Cost estimate: ~$0.25-1.00 per transcript

**Recommendation:** Start with GPT-4, evaluate Claude if costs become issue.

### Prompt Engineering Strategy

- System message defines suggestion categories and rules
- Few-shot examples of good vs. bad suggestions
- Strict JSON schema enforcement
- Include negative examples ("don't do this")
- Iterative testing with real transcripts

### Performance Optimization

- Cache dashboard state (don't refetch on every processing)
- Process transcripts async (don't block UI)
- Show progress indicator during processing
- Consider chunking very long transcripts (>10K words)
- Rate limit to prevent abuse (max 10 transcripts per hour per user)

### Security Considerations

- Transcripts may contain sensitive information (financials, personal data)
- Store encrypted at rest
- Add RLS policies: users can only access transcripts they created
- Audit log who processed what transcript when
- Consider retention policy: auto-delete transcripts after 90 days?

### Mobile Considerations

- Paste from mobile transcription apps (voice-to-text)
- Large touch targets for accept/dismiss
- Minimize scrolling during review
- Consider voice input for transcript (future enhancement)
