# Daily Log — What It Is & How to Build It

## What Is a Construction Daily Log?

A daily log is a field diary for a construction site. Every day, the project manager (Dean) walks the property and needs to record what's actually happening — who showed up, what work got done, what went wrong, what the weather was like.

Right now that knowledge lives in Dean's head, scattered texts, and photos buried in his camera roll. If Dean's out sick for a week, nobody knows what happened on site.

### Why It Matters

**Contractor disputes:** Contractor says "we finished demo on Unit 204 Tuesday." Daily log either confirms or disproves it with timestamped photos and notes.

**Weather delays:** Contractors love blaming weather for missed deadlines. If the log shows it was 72°F and sunny, that excuse dies.

**Lender draws:** Construction lenders want proof of progress. An organized daily log with photos is exactly what they ask for.

**Scaling beyond Dean:** Right now Dean physically walks every site. The daily log is how his observations become searchable company knowledge instead of disappearing when he drives to the next property.

### How This Differs From What Already Exists

The app already has **site verification photos** tied to payment applications — those prove a contractor deserves to get paid. The daily log is different. It's a general-purpose "what happened at this property today" record. Not tied to any specific payment or contractor.

---

## What Dean's Experience Should Look Like

1. Opens app on his phone, he's at a property
2. Taps **"New Daily Log"** — date is today, weather auto-fetches
3. Walks the site snapping photos (reuse the existing QuickCapture camera pattern)
4. Types quick notes between photos OR taps a mic button and just talks
5. Audio recordings save and queue for transcription
6. Hits **"Save"**
7. **AI runs as the final step** — takes everything (photos, typed notes, transcribed audio, weather) and organizes it into a structured daily report

The key insight: Dean is walking a job site with dirty hands. He's not going to type paragraphs. Audio notes are the primary input. Photos are the evidence. Typed notes are quick one-liners. AI does the organizing.

---

## Database Schema

Three tables. The main log, its photos, and its audio recordings.

```sql
CREATE TABLE daily_logs (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() NOT NULL,
    property_id INTEGER NOT NULL REFERENCES properties(id),
    created_by INTEGER NOT NULL REFERENCES users(id),
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Weather (auto-fetched on creation)
    weather_temp_f DECIMAL(5,2),
    weather_conditions VARCHAR(100),   -- 'sunny', 'rain', 'overcast'
    weather_wind_mph DECIMAL(5,2),
    weather_humidity INTEGER,
    weather_raw_json JSONB,            -- full API response for reference

    -- Typed notes
    notes TEXT,

    -- AI-organized output (generated after save)
    ai_summary TEXT,                   -- the clean, organized report
    ai_summary_json JSONB,             -- structured version for UI display
    ai_processed_at TIMESTAMP,

    status VARCHAR(20) DEFAULT 'draft', -- draft | submitted
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_daily_logs_property_date ON daily_logs(property_id, log_date);

CREATE TABLE daily_log_photos (
    id SERIAL PRIMARY KEY,
    daily_log_id INTEGER NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    supabase_storage_path TEXT NOT NULL,
    caption TEXT,
    sort_order INTEGER DEFAULT 0,
    ai_tags JSONB,                     -- AI can tag: ['demolition', 'plumbing', 'exterior']
    taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE daily_log_audio (
    id SERIAL PRIMARY KEY,
    daily_log_id INTEGER NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
    audio_url TEXT NOT NULL,
    supabase_storage_path TEXT NOT NULL,
    duration_seconds INTEGER,
    transcription TEXT,
    transcription_status VARCHAR(20) DEFAULT 'pending', -- pending | processing | completed | failed
    transcribed_at TIMESTAMP,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Supabase Storage

Add two buckets (same pattern as existing `site-photos`):
- **`daily-log-photos`** — path: `{property_id}/{log_date}/{timestamp}.jpg`
- **`daily-log-audio`** — path: `{property_id}/{log_date}/{timestamp}.webm`

---

## API Endpoints

Follow the existing `withAuth` / `supabaseAdmin` / `successResponse` / `errorResponse` patterns.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/daily-logs?property_id=X` | List logs for a property |
| POST | `/api/daily-logs` | Create new log (auto-fetch weather here) |
| PUT | `/api/daily-logs/[id]` | Update notes, status |
| POST | `/api/daily-logs/[id]/photos` | Upload photo (same pattern as payment app photos) |
| POST | `/api/daily-logs/[id]/audio` | Upload audio recording |
| POST | `/api/daily-logs/[id]/organize` | Trigger AI organization step |

---

## Build Sequence

### Step 1: Database + Basic CRUD

Create the three tables. Build the GET/POST/PUT API routes. Create a React Query hook (`useDailyLogs`). Nothing fancy yet — just get data flowing.

### Step 2: Weather Auto-Fetch

When a new log is created, hit a weather API to get current conditions for the property's location. OpenWeatherMap has a free tier that works fine. Store the response in `weather_raw_json` and pull out the display fields (temp, conditions, wind).

This happens server-side in the POST `/api/daily-logs` route — don't make the client do it.

### Step 3: Photo Capture

Reuse the existing **QuickCapture** camera component pattern (see `components/camera/QuickCapture.tsx`). Same rapid-fire capture flow, same Supabase Storage upload pattern, just pointing at the `daily-log-photos` bucket and saving to `daily_log_photos` table instead of `site_verification_photos`.

### Step 4: Audio Recording + Transcription

This is the new piece. Two parts:

**Recording (client-side):**
- Use the browser's `MediaRecorder` API
- Record as `audio/webm` (best browser support)
- Show a simple record/stop button with a duration timer
- On stop, upload the blob to Supabase Storage via an API route (same pattern as photo uploads)

**Transcription (server-side):**
- After audio uploads, call the OpenAI Whisper API (`/v1/audio/transcriptions`)
- Whisper is the simplest — send the audio file, get text back
- Update `daily_log_audio.transcription` with the result
- Set `transcription_status` to `completed`

This can be synchronous (transcribe right after upload) or async. For now synchronous is fine — Whisper handles a 2-minute clip in a few seconds.

### Step 5: AI Organization (The Final Step)

This is where it all comes together. When the user taps **"Organize & Submit"**, call Claude with everything collected:

**What you send:**
- Weather data
- All typed notes
- All audio transcriptions
- Photo count and any captions
- Property name and date

**What you ask Claude to produce:**
A clean structured daily report with sections like:
- **Summary** (2-3 sentences)
- **Work Completed**
- **Issues & Blockers**
- **Contractor Activity** (who was on site, what they did)
- **Safety Observations**
- **Follow-Up Items**

**Example prompt:**
```
You are organizing a construction daily log for {property_name} on {date}.
Weather: {temp}°F, {conditions}, wind {wind}mph.

The field PM recorded the following notes and audio throughout the day.
Organize this into a clean daily report with these sections:
- Summary (2-3 sentences)
- Work Completed
- Issues & Blockers
- Contractor Activity
- Safety Observations
- Follow-Up Items

Raw inputs:
{typed notes}
{transcription 1}
{transcription 2}
...
```

Save the AI output to `ai_summary` (readable text) and `ai_summary_json` (structured for UI rendering).

---

## UI Components

### Daily Log List View
- Lives under the property detail page
- Logs sorted by date, newest first
- Each card: date, weather icon + temp, photo count, status badge (draft/submitted)
- Tap to view/edit

### Daily Log Entry View (Create/Edit)
Four sections stacked vertically, mobile-first:

1. **Header** — date (auto), weather (auto-fetched, show icon + temp)
2. **Photos** — thumbnail grid + "Add Photos" button → opens QuickCapture
3. **Notes** — simple textarea
4. **Audio** — record button + list of recordings showing transcription status
5. **Footer** — "Save Draft" and "Organize & Submit" buttons

### Organized Report View
After AI processes, show the structured report. Clean, readable, printable. This is what Alex and lenders look at.

---

## File Locations

To be determined during implementation.
