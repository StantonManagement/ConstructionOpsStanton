# Bid Management System

## What Problem This Solves

Getting bids is chaos. Contractors hand you printouts, text photos of handwritten numbers, or just tell you a price over the phone. Nothing is consistent. Then you're juggling multiple bids for the same job, trying to remember who included permits and who didn't, while the guy with the lowest number conveniently left out half the scope.

This system captures all that mess and turns it into something you can compare, track, and learn from.

## The Three Main Things This Does

1. **Capture bids** — Photo, PDF, or voice. AI extracts the details. You verify.
2. **Run bid rounds** — Define scope once, send to multiple contractors, track responses, compare apples to apples.
3. **Build contractor intelligence** — Know who sticks to their bids vs. who are change order kings. See who's reliable vs. who ghosts.

---

## How Bids Get Into the System

### Photo or PDF

Take a photo of whatever the contractor handed you—typed estimate, handwritten napkin math, whatever. Or upload a PDF they emailed.

AI reads it and pulls out:
- Contractor name
- Total amount
- Line items (if they broke it down)
- What work it covers

You see the original next to what AI extracted. If it's right, one tap to confirm. If something's wrong, quick edit and save.

### Voice

Record yourself: "Got a bid from Mike's Electric, forty-two hundred for rough-in on Hartford units 3B through 4B."

System transcribes and extracts the key info. Same verification screen.

### Manual Entry

For entering from email or a phone call. Pick the contractor, enter the amount, note the scope.

**All three end up in the same place:** a clean bid record with the original source attached.

---

## Bid Rounds: Getting Multiple Bids on the Same Scope

When you need bids for a job, create a bid round.

### Step 1: Define the Scope

Pick the trade and scope type (e.g., Electrical → Rough-in).

The system shows a checklist of items to include, based on what's typically been included or excluded in past bids for this type of work:

**Typically included:**
- ☑ Rough wiring
- ☑ Panel installation
- ☑ Junction boxes

**Often excluded (watch for these):**
- ☑ Permits & inspection fees — excluded in 4 of 8 past bids
- ☑ Fire alarm rough-in — excluded in 3 of 8 past bids

You check what should be in scope. Add project-specific details: how many units, timeline, site visit availability.

Set a deadline for bids.

### Step 2: Pick Contractors to Invite

System shows contractors who've bid this type of work before:

| Contractor | Avg Bid | Change Order History | Last Bid |
|------------|---------|---------------------|----------|
| Mike's Electric | $4,100 | +3% ✓ | Jan 2025 |
| ABC Electric | $4,000 | +12% ⚠️ | Nov 2024 |
| Reliable Electric | $4,400 | +1% ✓ | Dec 2024 |

That warning on ABC? System knows they tend to come in over their original bid. You can still invite them, but you're informed.

Select who you want. Hit send.

### Step 3: What Contractors See

They get a text with a link:

> "Hey Mike, Stanton Capital has a job for bid: Electrical Rough-in at Hartford 1. Details and submit here: [link]"

The link shows them:
- Project and scope description
- The checklist of what to include
- Timeline
- Any attached scope docs or photos

They can either:
- Enter their bid amount and submit
- Upload their own estimate (photo/PDF) — AI extracts it on your end
- Decline with a reason

**Decline Options:**

If they can't bid, they pick from:
- Too busy right now
- Timeline doesn't work
- Not my type of work
- Job too small / too large
- Location too far
- Other

This is optional but useful. Over time you learn: "Mike's Electric declines 80% citing 'too busy' — maybe don't prioritize them for rush jobs."

### Step 4: Tracking Responses

Once RFPs are out, you see:

```
BID ROUND: Electrical Rough-in — Hartford 1
Due: Feb 7 (3 days)

Mike's Electric       ✅ Received    $4,200
ABC Electric          ✅ Received    $3,400 ⚠️ Low
Reliable Electric     ⏳ Pending     (opened link, hasn't responded)
```

- **⚠️ Low** = significantly below others. Usually means something's missing.
- **Opened link** = they saw it. Not ghosting, just slow or deciding.

**Reminders:**

Busy contractors are usually the good ones. System follows up automatically:

| When | Situation | Action |
|------|-----------|--------|
| 2 days before due | Sent but not opened | "Did you see our bid request?" |
| 2 days before due | Opened but no response | "Still interested in bidding?" |
| Due date | No response | Flags for your decision |

You control how automatic this is—fully auto, or system queues reminders for you to approve.

### Step 5: Comparing Bids

This is where it gets useful. Side-by-side view:

|  | Mike's Electric | ABC Electric | Reliable |
|--|----------------|--------------|----------|
| **Total** | $4,200 | $3,400 ⚠️ | (pending) |
| **Scope Coverage:** | | | |
| Rough wiring | ✓ | ✓ | — |
| Panel installation | ✓ | ✓ | — |
| Junction boxes | ✓ | ✓ | — |
| Permits/inspection | ✓ | ✗ excluded | — |
| Fire alarm rough | ✓ | ✗ excluded | — |
| **Adjusted comparison** | $4,200 | ~$4,100* | — |
| with missing scope | | | |
| **CO history** | +3% | +12% | +1% |

Now you see it: ABC's low bid excluded permits and fire alarm. Add those back and they're about the same as Mike's—but with worse change order history.

**Marking Scope Coverage:**

When you review each bid, you check off which scope items they included. AI pre-fills this if their bid doc mentions specific items. You verify or correct.

**Clarifications:**

When you spot an exclusion, two options:

1. **Call them** — Log the outcome: "Called ABC, permits add $400, fire alarm add $300, revised total $4,100"

2. **Send a clarification request** — They get a text with a link asking about specific items:

```
Permits & inspection fees
○ Included ○ Add $____ ○ N/A

Fire alarm rough-in
○ Included ○ Add $____ ○ N/A
```

Their response flows back in, bid updates, comparison recalculates.

### Step 6: Awarding the Job

When you select a winner:
- Winning bid marked as won
- Losing bids marked as lost (useful for "why didn't we pick them" later)
- System prompts to set up the contract/project connection
- Option to notify losers (close the loop)

### Step 7: After the Job — Tracking Reality vs. Bid

The bid connects to the project. When work is done:

```
Original bid     $4,200
Change orders    +$380
Final cost       $4,580
Variance         +9%
```

This feeds back into contractor profiles. Next time Mike's Electric comes up, you'll see their average variance across all jobs.

---

## What You Learn Over Time

### About Contractors

- **Win rate** — How often they get selected
- **Response rate** — Bid vs. decline vs. ghost
- **Decline patterns** — "Always too busy" or "won't do small jobs"
- **Change order variance** — Do they stick to their number?
- **Price positioning** — Consistently high, low, or middle of pack?

### About Scopes

- What items get excluded most often
- What causes change orders
- Who's competitive for what type of work

### Catching Change Order Kings

The system calculates:

```
CO Variance = (Final Cost - Original Bid) / Original Bid
```

Displayed as:
- **+1–5%:** Normal (green)
- **+6–10%:** Moderate (yellow)
- **+11%+:** High risk (red ⚠️)

You see this when:
- Selecting who to invite
- Comparing bids
- Before awarding

"ABC Electric: average +12% over bid across 5 jobs" — now you know what you're getting into.

---

## The Daily View

When you open the system:

```
ACTIVE BID ROUNDS

Hartford 1 - Electrical Rough-in          Due in 3 days
  2 of 3 received | 1 low bid flagged
  [View Round]

Southend - HVAC Replacement               Due in 5 days
  0 of 4 received | 2 opened, haven't responded
  [View Round] [Send Reminders]

Hartford 1 - Drywall Finish               Due tomorrow ⚠️
  3 of 3 received | Ready to compare
  [Compare Bids]

─────────────────────────────────────────
[+ New Bid Round]    [Capture Walk-in Bid]
```

**"Capture Walk-in Bid"** = contractor shows up with a bid you didn't request. Still capture it—goes in the system, usable for future reference.

---

## Looking Up Past Bid Rounds

After a job completes, full history available:

```
Bid Round: Hartford 1 - Electrical Rough-in
Closed Feb 10, 2025

SUMMARY
Invited: 4 contractors
Received: 3 bids
Declined: 1 (Reliable Electric — too busy)
Winner: Mike's Electric @ $4,200

OUTCOME
Original bid: $4,200
Change orders: +$380
Final cost: $4,580
Variance: +9%

ALL BIDS
┌──────────────────┬─────────┬────────┬──────────────────────────┐
│ Contractor       │ Amount  │ Result │ Notes                    │
├──────────────────┼─────────┼────────┼──────────────────────────┤
│ Mike's Electric  │ $4,200  │ ✓ Won  │                          │
│ ABC Electric     │ $3,400  │ Lost   │ Excluded permits, fire   │
│ FastWire Electric│ $4,600  │ Lost   │                          │
│ Reliable Electric│ —       │ Declined│ Too busy                │
└──────────────────┴─────────┴────────┴──────────────────────────┘

FULL TIMELINE
Feb 3:  RFPs sent
Feb 4:  Mike's submitted
Feb 5:  ABC submitted, Reliable declined
Feb 6:  Reminder sent to FastWire
Feb 7:  FastWire submitted
Feb 8:  Clarification sent to ABC, response received
Feb 10: Awarded to Mike's
Mar 15: Job completed, CO logged
```

---

## Summary: Before vs After

| Before | After |
|--------|-------|
| Bids scattered across texts, emails, paper | All in one place, searchable |
| "Did they include permits?" — who knows | Scope coverage tracked on every bid |
| Comparing bids from memory | Side-by-side with adjusted pricing |
| Change order surprise | Contractor history visible before you award |
| "Who should I get bids from?" | Search by trade, see past pricing and reliability |
| Chasing contractors manually | Automated reminders, decline tracking |
| No record of past decisions | Full audit trail on every bid round |

---

## Simple Process Flow

### Way 1: Quick Capture (Someone Walks Up)
```
1. Contractor gives you a bid
   ↓
2. Photo/PDF/Voice → AI extracts details
   ↓
3. You verify and save
   ↓
4. Done - bid stored for reference
```

### Way 2: Competitive Bid Round (Main Feature)
```
1. Create bid round → Define scope
   ↓
2. Pick contractors to invite
   ↓
3. System sends SMS with link
   ↓
4. Contractors submit or decline
   ↓
5. Track responses (system auto-reminds)
   ↓
6. Compare bids side-by-side
   ↓
7. Send clarifications if needed
   ↓
8. Pick winner
   ↓
9. Track actual vs bid (change orders)
   ↓
10. Learn for next time
```

---

## Technical Implementation Notes

This document covers the workflow and user experience. For technical implementation details including:
- Database schema
- API endpoints
- AI integration
- SMS webhooks
- Contractor portal

See separate technical specification document.

---

## Questions for Implementation

### Integration & Existing System
1. How does this connect to current `contractors`, `projects`, `project_line_items` tables?
2. Is this replacing any existing bid/contractor selection process?

### AI & External Services
3. What AI service for document extraction? (OpenAI Vision API?)
4. What service for voice transcription? (OpenAI Whisper?)
5. Budget constraints per extraction?

### SMS & Communication
6. Use existing Twilio setup (+1 860 689 1617)?
7. Share same `/api/sms/webhook` or separate handling?

### Data Model & Scope
8. Should scope templates be configurable per trade?
9. Pre-populate common templates or build as you go?
10. Do you already track change orders in the system?

### MVP & Priority
11. What's the priority order?
    - Manual bid capture → bid rounds → AI extraction?
    - Or AI extraction first (saves most time)?
    - Or bid rounds first (core workflow)?
12. Timeline and urgency?

### Technical Details
13. Contractor portal: accounts or token-based (like current `/contractor-portal/[token]`)?
14. Photo storage: Supabase storage like current photos?
15. Keep original source (photo/PDF) attached to every bid?

---

*Document created: February 9, 2026*
