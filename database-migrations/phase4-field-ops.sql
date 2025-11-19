-- Phase 4: Field Operations Database Migration
-- Creates tables for Punch List Management, Photo Documentation, and Warranty Tracking

-- ============================================
-- PUNCH LIST MANAGEMENT
-- ============================================

-- Punch List Categories Table
CREATE TABLE IF NOT EXISTS punch_list_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(50),
  color VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed standard categories
INSERT INTO punch_list_categories (name, icon, color) VALUES
  ('Electrical', '⚡', '#F59E0B'),
  ('Plumbing', '💧', '#3B82F6'),
  ('HVAC', '🌡️', '#8B5CF6'),
  ('Drywall', '🧱', '#6B7280'),
  ('Paint', '🎨', '#EC4899'),
  ('Flooring', '📐', '#14B8A6'),
  ('Carpentry', '🔨', '#92400E'),
  ('Exterior', '🏠', '#059669'),
  ('Landscaping', '🌳', '#10B981'),
  ('General', '📋', '#6366F1')
ON CONFLICT (name) DO NOTHING;

-- Punch List Items Table
CREATE TABLE IF NOT EXISTS punch_list_items (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item_number VARCHAR(20) NOT NULL,
  contractor_id INTEGER REFERENCES contractors(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  location VARCHAR(255),
  unit_number VARCHAR(50),
  trade_category VARCHAR(100),
  severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'verified', 'rejected')),
  due_date DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to INTEGER REFERENCES contractors(id) ON DELETE SET NULL,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_date TIMESTAMP,
  verified_date TIMESTAMP,
  notes TEXT,
  UNIQUE(project_id, item_number)
);

-- Indexes for punch list items
CREATE INDEX IF NOT EXISTS idx_punch_list_project ON punch_list_items(project_id);
CREATE INDEX IF NOT EXISTS idx_punch_list_status ON punch_list_items(status);
CREATE INDEX IF NOT EXISTS idx_punch_list_contractor ON punch_list_items(contractor_id);
CREATE INDEX IF NOT EXISTS idx_punch_list_due_date ON punch_list_items(due_date);
CREATE INDEX IF NOT EXISTS idx_punch_list_severity ON punch_list_items(severity);
CREATE INDEX IF NOT EXISTS idx_punch_list_created_by ON punch_list_items(created_by);

-- Punch List Comments Table
CREATE TABLE IF NOT EXISTS punch_list_comments (
  id SERIAL PRIMARY KEY,
  punch_item_id INTEGER NOT NULL REFERENCES punch_list_items(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_punch_comments_item ON punch_list_comments(punch_item_id);
CREATE INDEX IF NOT EXISTS idx_punch_comments_author ON punch_list_comments(author_id);

-- ============================================
-- PHOTO DOCUMENTATION
-- ============================================

-- Photos Table (central repository)
CREATE TABLE IF NOT EXISTS photos (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  punch_item_id INTEGER REFERENCES punch_list_items(id) ON DELETE SET NULL,
  payment_app_id INTEGER REFERENCES payment_applications(id) ON DELETE SET NULL,
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  photo_type VARCHAR(50) DEFAULT 'general' CHECK (photo_type IN ('before', 'in_progress', 'after', 'issue', 'inspection', 'general')),
  gps_latitude DECIMAL(10, 8),
  gps_longitude DECIMAL(11, 8),
  location_description VARCHAR(255),
  timestamp TIMESTAMP DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device_info JSONB,
  visibility VARCHAR(20) DEFAULT 'internal' CHECK (visibility IN ('public', 'internal', 'private')),
  tags TEXT[],
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for photos
CREATE INDEX IF NOT EXISTS idx_photos_project ON photos(project_id);
CREATE INDEX IF NOT EXISTS idx_photos_punch_item ON photos(punch_item_id);
CREATE INDEX IF NOT EXISTS idx_photos_payment_app ON photos(payment_app_id);
CREATE INDEX IF NOT EXISTS idx_photos_type ON photos(photo_type);
CREATE INDEX IF NOT EXISTS idx_photos_timestamp ON photos(timestamp);
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_by ON photos(uploaded_by);

-- Photo Collections Table (for before/after pairs, progress series)
CREATE TABLE IF NOT EXISTS photo_collections (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  collection_name VARCHAR(255) NOT NULL,
  collection_type VARCHAR(50) DEFAULT 'general' CHECK (collection_type IN ('before_after', 'progress_series', 'damage_documentation', 'final_inspection', 'general')),
  photo_ids INTEGER[] NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photo_collections_project ON photo_collections(project_id);
CREATE INDEX IF NOT EXISTS idx_photo_collections_type ON photo_collections(collection_type);

-- Photo Annotations Table
CREATE TABLE IF NOT EXISTS photo_annotations (
  id SERIAL PRIMARY KEY,
  photo_id INTEGER NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  annotation_type VARCHAR(50) NOT NULL CHECK (annotation_type IN ('arrow', 'circle', 'rectangle', 'text', 'measurement')),
  x_coord DECIMAL(10, 4),
  y_coord DECIMAL(10, 4),
  width DECIMAL(10, 4),
  height DECIMAL(10, 4),
  annotation_text TEXT,
  color VARCHAR(20) DEFAULT '#FF0000',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photo_annotations_photo ON photo_annotations(photo_id);

-- ============================================
-- WARRANTY TRACKING
-- ============================================

-- Warranty Types Table
CREATE TABLE IF NOT EXISTS warranty_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  default_duration_months INTEGER,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed standard warranty types
INSERT INTO warranty_types (name, default_duration_months, description) VALUES
  ('1 Year Labor', 12, 'Standard one-year labor warranty'),
  ('2 Year Labor', 24, 'Extended two-year labor warranty'),
  ('5 Year Materials', 60, 'Five-year materials warranty'),
  ('10 Year Materials', 120, 'Ten-year materials warranty'),
  ('Lifetime', NULL, 'Lifetime warranty coverage'),
  ('Manufacturer Warranty', NULL, 'Manufacturer-provided warranty')
ON CONFLICT (name) DO NOTHING;

-- Warranties Table
CREATE TABLE IF NOT EXISTS warranties (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contractor_id INTEGER REFERENCES contractors(id) ON DELETE SET NULL,
  unit_number VARCHAR(50),
  warranty_type VARCHAR(100),
  coverage_description TEXT NOT NULL,
  covered_items TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_months INTEGER,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'expired', 'claimed', 'void')),
  warranty_document_url TEXT,
  receipt_url TEXT,
  terms_pdf_url TEXT,
  exclusions TEXT,
  claim_process TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for warranties
CREATE INDEX IF NOT EXISTS idx_warranties_project ON warranties(project_id);
CREATE INDEX IF NOT EXISTS idx_warranties_contractor ON warranties(contractor_id);
CREATE INDEX IF NOT EXISTS idx_warranties_end_date ON warranties(end_date);
CREATE INDEX IF NOT EXISTS idx_warranties_status ON warranties(status);
CREATE INDEX IF NOT EXISTS idx_warranties_start_date ON warranties(start_date);

-- Warranty Claims Table
CREATE TABLE IF NOT EXISTS warranty_claims (
  id SERIAL PRIMARY KEY,
  warranty_id INTEGER NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
  punch_item_id INTEGER REFERENCES punch_list_items(id) ON DELETE SET NULL,
  claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
  issue_description TEXT NOT NULL,
  claim_amount DECIMAL(10, 2),
  urgency VARCHAR(20) DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high', 'emergency')),
  status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'denied', 'resolved', 'withdrawn')),
  submitted_to_contractor_date DATE,
  contractor_response TEXT,
  resolution_date DATE,
  resolution_notes TEXT,
  claim_approved BOOLEAN,
  amount_recovered DECIMAL(10, 2),
  evidence_photo_urls TEXT[],
  filed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warranty_claims_warranty ON warranty_claims(warranty_id);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_status ON warranty_claims(status);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_claim_date ON warranty_claims(claim_date);

-- Warranty Reminders Table
CREATE TABLE IF NOT EXISTS warranty_reminders (
  id SERIAL PRIMARY KEY,
  warranty_id INTEGER NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  days_before_expiration INTEGER NOT NULL,
  sent_date TIMESTAMP,
  recipient_emails TEXT[],
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'opened', 'acknowledged')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warranty_reminders_warranty ON warranty_reminders(warranty_id);
CREATE INDEX IF NOT EXISTS idx_warranty_reminders_date ON warranty_reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_warranty_reminders_status ON warranty_reminders(status);

-- ============================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_punch_list_items_updated_at BEFORE UPDATE ON punch_list_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_punch_list_comments_updated_at BEFORE UPDATE ON punch_list_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_photos_updated_at BEFORE UPDATE ON photos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_photo_collections_updated_at BEFORE UPDATE ON photo_collections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_warranties_updated_at BEFORE UPDATE ON warranties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_warranty_claims_updated_at BEFORE UPDATE ON warranty_claims FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all new tables
ALTER TABLE punch_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE punch_list_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_reminders ENABLE ROW LEVEL SECURITY;

-- Punch List Items Policies
CREATE POLICY "Users can view punch list items" ON punch_list_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert punch list items" ON punch_list_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update punch list items" ON punch_list_items FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete punch list items" ON punch_list_items FOR DELETE USING (auth.role() = 'authenticated');

-- Punch List Comments Policies
CREATE POLICY "Users can view punch list comments" ON punch_list_comments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert punch list comments" ON punch_list_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own comments" ON punch_list_comments FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users can delete own comments" ON punch_list_comments FOR DELETE USING (auth.uid() = author_id);

-- Photos Policies
CREATE POLICY "Users can view photos" ON photos FOR SELECT USING (
  auth.role() = 'authenticated' AND (
    visibility = 'public' OR
    visibility = 'internal' OR
    (visibility = 'private' AND auth.uid() = uploaded_by)
  )
);
CREATE POLICY "Users can insert photos" ON photos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own photos" ON photos FOR UPDATE USING (auth.uid() = uploaded_by);
CREATE POLICY "Users can delete own photos" ON photos FOR DELETE USING (auth.uid() = uploaded_by);

-- Photo Collections Policies
CREATE POLICY "Users can view photo collections" ON photo_collections FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert photo collections" ON photo_collections FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own collections" ON photo_collections FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own collections" ON photo_collections FOR DELETE USING (auth.uid() = created_by);

-- Photo Annotations Policies
CREATE POLICY "Users can view photo annotations" ON photo_annotations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert photo annotations" ON photo_annotations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own annotations" ON photo_annotations FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own annotations" ON photo_annotations FOR DELETE USING (auth.uid() = created_by);

-- Warranties Policies
CREATE POLICY "Users can view warranties" ON warranties FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert warranties" ON warranties FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update warranties" ON warranties FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete warranties" ON warranties FOR DELETE USING (auth.role() = 'authenticated');

-- Warranty Claims Policies
CREATE POLICY "Users can view warranty claims" ON warranty_claims FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert warranty claims" ON warranty_claims FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update warranty claims" ON warranty_claims FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete warranty claims" ON warranty_claims FOR DELETE USING (auth.role() = 'authenticated');

-- Warranty Reminders Policies (admin only)
CREATE POLICY "Users can view warranty reminders" ON warranty_reminders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "System can manage warranty reminders" ON warranty_reminders FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to generate punch list item number
CREATE OR REPLACE FUNCTION generate_punch_item_number(p_project_id INTEGER)
RETURNS VARCHAR AS $$
DECLARE
  next_number INTEGER;
  item_number VARCHAR(20);
BEGIN
  -- Get the next number for this project
  SELECT COALESCE(MAX(CAST(SUBSTRING(item_number FROM 3) AS INTEGER)), 0) + 1
  INTO next_number
  FROM punch_list_items
  WHERE project_id = p_project_id;
  
  -- Format as P-001, P-002, etc.
  item_number := 'P-' || LPAD(next_number::TEXT, 3, '0');
  
  RETURN item_number;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate default due date based on severity
CREATE OR REPLACE FUNCTION calculate_punch_due_date(p_severity VARCHAR, p_created_date TIMESTAMP)
RETURNS DATE AS $$
BEGIN
  RETURN CASE p_severity
    WHEN 'critical' THEN (p_created_date + INTERVAL '3 days')::DATE
    WHEN 'high' THEN (p_created_date + INTERVAL '5 days')::DATE
    WHEN 'medium' THEN (p_created_date + INTERVAL '7 days')::DATE
    WHEN 'low' THEN (p_created_date + INTERVAL '14 days')::DATE
    ELSE (p_created_date + INTERVAL '7 days')::DATE
  END;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-update warranty status based on dates
CREATE OR REPLACE FUNCTION update_warranty_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_date < CURRENT_DATE AND NEW.status = 'active' THEN
    NEW.status := 'expired';
  ELSIF NEW.start_date <= CURRENT_DATE AND NEW.status = 'pending' THEN
    NEW.status := 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER warranty_status_update BEFORE INSERT OR UPDATE ON warranties 
FOR EACH ROW EXECUTE FUNCTION update_warranty_status();

-- ============================================
-- VIEWS FOR REPORTING
-- ============================================

-- View for punch list summary by project
CREATE OR REPLACE VIEW punch_list_summary AS
SELECT 
  project_id,
  COUNT(*) as total_items,
  COUNT(*) FILTER (WHERE status = 'open') as open_items,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_items,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_items,
  COUNT(*) FILTER (WHERE status = 'verified') as verified_items,
  COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('verified', 'completed')) as overdue_items,
  COUNT(*) FILTER (WHERE severity = 'critical') as critical_items,
  COUNT(*) FILTER (WHERE severity = 'high') as high_severity_items
FROM punch_list_items
GROUP BY project_id;

-- View for expiring warranties
CREATE OR REPLACE VIEW expiring_warranties AS
SELECT 
  w.*,
  p.name as project_name,
  c.name as contractor_name,
  (w.end_date - CURRENT_DATE) as days_until_expiration
FROM warranties w
LEFT JOIN projects p ON w.project_id = p.id
LEFT JOIN contractors c ON w.contractor_id = c.id
WHERE w.status = 'active' 
  AND w.end_date > CURRENT_DATE 
  AND w.end_date <= CURRENT_DATE + INTERVAL '90 days'
ORDER BY w.end_date ASC;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE punch_list_items IS 'Deficiency tracking for construction projects';
COMMENT ON TABLE photos IS 'Central repository for all project photos with metadata';
COMMENT ON TABLE warranties IS 'Warranty tracking for completed work';
COMMENT ON TABLE warranty_claims IS 'Claims filed against warranties';
COMMENT ON FUNCTION generate_punch_item_number IS 'Generates sequential punch list item numbers per project (P-001, P-002, etc.)';
COMMENT ON VIEW punch_list_summary IS 'Summary statistics for punch list items by project';
COMMENT ON VIEW expiring_warranties IS 'Warranties expiring within 90 days';

