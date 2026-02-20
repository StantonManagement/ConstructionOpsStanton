-- Daily Logs Feature
-- Field diary for construction sites with photos, audio notes, weather tracking, and AI organization

-- Main daily logs table
CREATE TABLE daily_logs (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() NOT NULL,
    property_id UUID NOT NULL REFERENCES properties(id),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Weather (auto-fetched on creation)
    weather_temp_f DECIMAL(5,2),
    weather_conditions VARCHAR(100),   -- 'sunny', 'rain', 'overcast', etc.
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

-- Index for quick property + date lookups
CREATE INDEX idx_daily_logs_property_date ON daily_logs(property_id, log_date);
CREATE INDEX idx_daily_logs_created_by ON daily_logs(created_by);
CREATE INDEX idx_daily_logs_status ON daily_logs(status) WHERE deleted_at IS NULL;

-- Photos attached to daily logs
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

CREATE INDEX idx_daily_log_photos_log_id ON daily_log_photos(daily_log_id);

-- Audio recordings attached to daily logs
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

CREATE INDEX idx_daily_log_audio_log_id ON daily_log_audio(daily_log_id);
CREATE INDEX idx_daily_log_audio_status ON daily_log_audio(transcription_status);

-- Enable Row Level Security
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_log_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_log_audio ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_logs
-- Allow authenticated users to view all daily logs (admins need to see all)
CREATE POLICY "Authenticated users can view daily logs" ON daily_logs
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Allow authenticated users to create daily logs
CREATE POLICY "Authenticated users can create daily logs" ON daily_logs
    FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Allow users to update their own logs
CREATE POLICY "Users can update their own daily logs" ON daily_logs
    FOR UPDATE
    USING (auth.uid() = created_by);

-- Allow users to delete their own logs
CREATE POLICY "Users can delete their own daily logs" ON daily_logs
    FOR DELETE
    USING (auth.uid() = created_by);

-- RLS Policies for daily_log_photos
CREATE POLICY "Authenticated users can view photos" ON daily_log_photos
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert photos to their logs" ON daily_log_photos
    FOR INSERT
    WITH CHECK (
        daily_log_id IN (
            SELECT id FROM daily_logs WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can delete photos from their logs" ON daily_log_photos
    FOR DELETE
    USING (
        daily_log_id IN (
            SELECT id FROM daily_logs WHERE created_by = auth.uid()
        )
    );

-- RLS Policies for daily_log_audio
CREATE POLICY "Authenticated users can view audio" ON daily_log_audio
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert audio to their logs" ON daily_log_audio
    FOR INSERT
    WITH CHECK (
        daily_log_id IN (
            SELECT id FROM daily_logs WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update audio in their logs" ON daily_log_audio
    FOR UPDATE
    USING (
        daily_log_id IN (
            SELECT id FROM daily_logs WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can delete audio from their logs" ON daily_log_audio
    FOR DELETE
    USING (
        daily_log_id IN (
            SELECT id FROM daily_logs WHERE created_by = auth.uid()
        )
    );

-- Add helpful comments
COMMENT ON TABLE daily_logs IS 'Field diary entries for construction sites';
COMMENT ON TABLE daily_log_photos IS 'Photos attached to daily log entries';
COMMENT ON TABLE daily_log_audio IS 'Audio recordings with transcriptions attached to daily log entries';
