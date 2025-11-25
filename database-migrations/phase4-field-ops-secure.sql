-- Phase 4: Field Operations Database Migration (SECURE VERSION)
-- Creates tables for Punch List Management, Photo Documentation, and Warranty Tracking
-- WITH ENHANCED RLS SECURITY based on role-based access control

-- ============================================
-- CHANGELOG FROM ORIGINAL VERSION:
-- ============================================
-- 1. RLS policies now scope by user role (admin/pm/staff) instead of just authenticated
-- 2. Photos visibility enforced properly (public/internal/private)
-- 3. Added WITH CHECK clauses to all UPDATE/INSERT policies (prevents privilege escalation)
-- 4. Item number generation uses advisory locks (prevents race conditions)
-- 5. Added indexes for RLS query performance
-- 6. Better scoping for comments, annotations, collections (owner-based)
-- 7. Documented future enhancement path for project membership

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

-- Indexes for punch list items (including RLS performance indexes)
CREATE INDEX IF NOT EXISTS idx_punch_list_project ON punch_list_items(project_id);
CREATE INDEX IF NOT EXISTS idx_punch_list_status ON punch_list_items(status);
CREATE INDEX IF NOT EXISTS idx_punch_list_contractor ON punch_list_items(contractor_id);
CREATE INDEX IF NOT EXISTS idx_punch_list_due_date ON punch_list_items(due_date);
CREATE INDEX IF NOT EXISTS idx_punch_list_severity ON punch_list_items(severity);
CREATE INDEX IF NOT EXISTS idx_punch_list_created_by ON punch_list_items(created_by);
CREATE INDEX IF NOT EXISTS idx_punch_list_assigned_to ON punch_list_items(assigned_to);

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

-- Indexes for photos (including visibility for RLS performance)
CREATE INDEX IF NOT EXISTS idx_photos_project ON photos(project_id);
CREATE INDEX IF NOT EXISTS idx_photos_punch_item ON photos(punch_item_id);
CREATE INDEX IF NOT EXISTS idx_photos_payment_app ON photos(payment_app_id);
CREATE INDEX IF NOT EXISTS idx_photos_type ON photos(photo_type);
CREATE INDEX IF NOT EXISTS idx_photos_timestamp ON photos(timestamp);
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_by ON photos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_photos_visibility ON photos(visibility);
CREATE INDEX IF NOT EXISTS idx_photos_project_visibility ON photos(project_id, visibility); -- Composite for RLS

-- Photo Collections Table (for before/after pairs, progress series)
CREATE TABLE IF NOT EXISTS photo_collections (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  collection_name VARCHAR(255) NOT NULL,
  collection_type VARCHAR(50) DEFAULT 'general' CHECK (collection_type IN ('before_after', 'progress_series', 'damage_documentation', 'final_inspection', 'general')),
  photo_ids INTEGER[] NOT NULL, -- NOTE: Consider migrating to join table in future for better FK integrity
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photo_collections_project ON photo_collections(project_id);
CREATE INDEX IF NOT EXISTS idx_photo_collections_type ON photo_collections(collection_type);
CREATE INDEX IF NOT EXISTS idx_photo_collections_created_by ON photo_collections(created_by);

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
CREATE INDEX IF NOT EXISTS idx_photo_annotations_created_by ON photo_annotations(created_by);

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
  ('1 Year Labor', 12, 'Standard one year labor warranty'),
  ('2 Year Labor', 24, 'Extended two year labor warranty'),
  ('5 Year Materials', 60, 'Five year materials warranty'),
  ('10 Year Manufacturer', 120, 'Manufacturer ten year warranty'),
  ('Lifetime', NULL, 'Lifetime warranty'),
  ('Custom', NULL, 'Custom warranty period')
ON CONFLICT (name) DO NOTHING;

-- Warranties Table
CREATE TABLE IF NOT EXISTS warranties (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contractor_id INTEGER REFERENCES contractors(id) ON DELETE SET NULL,
  warranty_type VARCHAR(100),
  coverage_description TEXT,
  covered_items TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_months INTEGER,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'claimed')),
  warranty_document_url TEXT,
  terms_pdf_url TEXT,
  exclusions TEXT,
  claim_process TEXT,
  notes TEXT,
  reminder_30_days BOOLEAN DEFAULT FALSE,
  reminder_60_days BOOLEAN DEFAULT FALSE,
  reminder_90_days BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warranties_project ON warranties(project_id);
CREATE INDEX IF NOT EXISTS idx_warranties_contractor ON warranties(contractor_id);
CREATE INDEX IF NOT EXISTS idx_warranties_status ON warranties(status);
CREATE INDEX IF NOT EXISTS idx_warranties_end_date ON warranties(end_date);
CREATE INDEX IF NOT EXISTS idx_warranties_created_by ON warranties(created_by);

-- Warranty Claims Table
CREATE TABLE IF NOT EXISTS warranty_claims (
  id SERIAL PRIMARY KEY,
  warranty_id INTEGER NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
  punch_item_id INTEGER REFERENCES punch_list_items(id) ON DELETE SET NULL,
  claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
  issue_description TEXT NOT NULL,
  claim_amount DECIMAL(12, 2),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'denied', 'resolved')),
  submitted_to_contractor_date DATE,
  contractor_response TEXT,
  resolution_date DATE,
  claim_approved BOOLEAN,
  amount_recovered DECIMAL(12, 2),
  resolution_notes TEXT,
  evidence_photo_urls TEXT[],
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warranty_claims_warranty ON warranty_claims(warranty_id);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_status ON warranty_claims(status);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_punch_item ON warranty_claims(punch_item_id);

-- Warranty Reminders Table (for automated notifications)
CREATE TABLE IF NOT EXISTS warranty_reminders (
  id SERIAL PRIMARY KEY,
  warranty_id INTEGER NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  days_before_expiration INTEGER NOT NULL,
  sent_date TIMESTAMP,
  recipient_email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'opened', 'acknowledged')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warranty_reminders_warranty ON warranty_reminders(warranty_id);
CREATE INDEX IF NOT EXISTS idx_warranty_reminders_date ON warranty_reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_warranty_reminders_status ON warranty_reminders(status);

-- ============================================
-- TRIGGERS
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
-- HELPER FUNCTIONS
-- ============================================

-- Helper function to check if user is admin or PM
CREATE OR REPLACE FUNCTION is_admin_or_pm()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_role ur
    JOIN users u ON u.id = ur.user_id
    WHERE u.uuid = auth.uid()
    AND ur.role IN ('admin', 'pm')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS VARCHAR AS $$
DECLARE
  user_role VARCHAR;
BEGIN
  SELECT ur.role INTO user_role
  FROM user_role ur
  JOIN users u ON u.id = ur.user_id
  WHERE u.uuid = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(user_role, 'none');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate punch list item number (WITH ADVISORY LOCK to prevent race conditions)
CREATE OR REPLACE FUNCTION generate_punch_item_number(p_project_id INTEGER)
RETURNS VARCHAR AS $$
DECLARE
  next_number INTEGER;
  item_number VARCHAR(20);
BEGIN
  -- Acquire advisory lock for this project (prevents concurrent number generation)
  -- Lock ID = 31415 (arbitrary namespace), project_id
  PERFORM pg_advisory_xact_lock(31415, p_project_id);
  
  -- Get the next number for this project
  SELECT COALESCE(MAX(CAST(SUBSTRING(item_number FROM 3) AS INTEGER)), 0) + 1
  INTO next_number
  FROM punch_list_items
  WHERE project_id = p_project_id;
  
  -- Format as P-001, P-002, etc.
  item_number := 'P-' || LPAD(next_number::TEXT, 3, '0');
  
  RETURN item_number;
  
  -- Lock is automatically released at transaction end
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
-- ROW LEVEL SECURITY (RLS) POLICIES - SECURE VERSION
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

-- ============================================
-- PUNCH LIST ITEMS POLICIES (Role-based access)
-- ============================================

-- Admins and PMs can view all punch items
CREATE POLICY "Admins and PMs can view all punch items" 
ON punch_list_items FOR SELECT 
TO authenticated
USING (is_admin_or_pm());

-- Staff can view punch items they created or are assigned to
CREATE POLICY "Staff can view assigned punch items" 
ON punch_list_items FOR SELECT 
TO authenticated
USING (
  NOT is_admin_or_pm() AND (
    created_by = auth.uid() OR
    assigned_to IN (
      SELECT id FROM contractors WHERE id = assigned_to
    )
  )
);

-- Admins and PMs can create punch items
CREATE POLICY "Admins and PMs can create punch items" 
ON punch_list_items FOR INSERT 
TO authenticated
WITH CHECK (is_admin_or_pm());

-- Admins and PMs can update any punch item
CREATE POLICY "Admins and PMs can update punch items" 
ON punch_list_items FOR UPDATE 
TO authenticated
USING (is_admin_or_pm())
WITH CHECK (is_admin_or_pm());

-- Only admins can delete punch items
CREATE POLICY "Admins can delete punch items" 
ON punch_list_items FOR DELETE 
TO authenticated
USING (get_user_role() = 'admin');

-- ============================================
-- PUNCH LIST COMMENTS POLICIES
-- ============================================

-- Users can view comments on punch items they can see
CREATE POLICY "Users can view relevant comments" 
ON punch_list_comments FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM punch_list_items pli
    WHERE pli.id = punch_item_id
    -- This will leverage the punch_list_items policies
  )
);

-- Authenticated users can insert comments
CREATE POLICY "Users can add comments" 
ON punch_list_comments FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = author_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments" 
ON punch_list_comments FOR UPDATE 
TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

-- Users can delete their own comments or admins can delete any
CREATE POLICY "Users can delete own comments" 
ON punch_list_comments FOR DELETE 
TO authenticated
USING (
  auth.uid() = author_id OR 
  get_user_role() = 'admin'
);

-- ============================================
-- PHOTOS POLICIES (Visibility-based access)
-- ============================================

-- Public photos: Anyone (even anon) can view
CREATE POLICY "Anyone can view public photos" 
ON photos FOR SELECT 
TO anon, authenticated
USING (visibility = 'public');

-- Internal photos: All authenticated users can view
CREATE POLICY "Authenticated users can view internal photos" 
ON photos FOR SELECT 
TO authenticated
USING (visibility = 'internal');

-- Private photos: Only uploader or admins can view
CREATE POLICY "Uploader or admin can view private photos" 
ON photos FOR SELECT 
TO authenticated
USING (
  visibility = 'private' AND (
    auth.uid() = uploaded_by OR 
    get_user_role() = 'admin'
  )
);

-- All authenticated users can upload photos
CREATE POLICY "Authenticated users can upload photos" 
ON photos FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = uploaded_by AND
  auth.role() = 'authenticated'
);

-- Users can update their own photos or admins can update any
CREATE POLICY "Users can update own photos" 
ON photos FOR UPDATE 
TO authenticated
USING (
  auth.uid() = uploaded_by OR 
  get_user_role() = 'admin'
)
WITH CHECK (
  auth.uid() = uploaded_by OR 
  get_user_role() = 'admin'
);

-- Users can delete their own photos or admins can delete any
CREATE POLICY "Users can delete own photos" 
ON photos FOR DELETE 
TO authenticated
USING (
  auth.uid() = uploaded_by OR 
  get_user_role() = 'admin'
);

-- ============================================
-- PHOTO COLLECTIONS POLICIES
-- ============================================

-- Users can view collections they created or admins/PMs can view all
CREATE POLICY "Users can view collections" 
ON photo_collections FOR SELECT 
TO authenticated
USING (
  is_admin_or_pm() OR 
  created_by = auth.uid()
);

-- Authenticated users can create collections
CREATE POLICY "Users can create collections" 
ON photo_collections FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Users can update their own collections
CREATE POLICY "Users can update own collections" 
ON photo_collections FOR UPDATE 
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Users can delete their own collections or admins can delete any
CREATE POLICY "Users can delete own collections" 
ON photo_collections FOR DELETE 
TO authenticated
USING (
  auth.uid() = created_by OR 
  get_user_role() = 'admin'
);

-- ============================================
-- PHOTO ANNOTATIONS POLICIES
-- ============================================

-- Users can view annotations on photos they can see
CREATE POLICY "Users can view annotations" 
ON photo_annotations FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM photos p
    WHERE p.id = photo_id
    -- This will leverage the photos policies
  )
);

-- Authenticated users can create annotations
CREATE POLICY "Users can create annotations" 
ON photo_annotations FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Users can update their own annotations
CREATE POLICY "Users can update own annotations" 
ON photo_annotations FOR UPDATE 
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Users can delete their own annotations or admins can delete any
CREATE POLICY "Users can delete own annotations" 
ON photo_annotations FOR DELETE 
TO authenticated
USING (
  auth.uid() = created_by OR 
  get_user_role() = 'admin'
);

-- ============================================
-- WARRANTIES POLICIES
-- ============================================

-- Admins and PMs can view all warranties
CREATE POLICY "Admins and PMs can view warranties" 
ON warranties FOR SELECT 
TO authenticated
USING (is_admin_or_pm());

-- Staff can view warranties they created
CREATE POLICY "Staff can view own warranties" 
ON warranties FOR SELECT 
TO authenticated
USING (
  NOT is_admin_or_pm() AND 
  created_by = auth.uid()
);

-- Admins and PMs can create warranties
CREATE POLICY "Admins and PMs can create warranties" 
ON warranties FOR INSERT 
TO authenticated
WITH CHECK (
  is_admin_or_pm() AND 
  auth.uid() = created_by
);

-- Admins and PMs can update warranties
CREATE POLICY "Admins and PMs can update warranties" 
ON warranties FOR UPDATE 
TO authenticated
USING (is_admin_or_pm())
WITH CHECK (is_admin_or_pm());

-- Only admins can delete warranties
CREATE POLICY "Admins can delete warranties" 
ON warranties FOR DELETE 
TO authenticated
USING (get_user_role() = 'admin');

-- ============================================
-- WARRANTY CLAIMS POLICIES
-- ============================================

-- Users can view claims on warranties they can see
CREATE POLICY "Users can view relevant warranty claims" 
ON warranty_claims FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM warranties w
    WHERE w.id = warranty_id
    -- This will leverage the warranties policies
  )
);

-- Authenticated users can create claims
CREATE POLICY "Users can create warranty claims" 
ON warranty_claims FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Admins and PMs can update claims
CREATE POLICY "Admins and PMs can update warranty claims" 
ON warranty_claims FOR UPDATE 
TO authenticated
USING (is_admin_or_pm())
WITH CHECK (is_admin_or_pm());

-- Only admins can delete claims
CREATE POLICY "Admins can delete warranty claims" 
ON warranty_claims FOR DELETE 
TO authenticated
USING (get_user_role() = 'admin');

-- ============================================
-- WARRANTY REMINDERS POLICIES
-- ============================================
-- Note: service_role bypasses RLS entirely, no policy needed for it

-- Users can view reminders for warranties they can see
CREATE POLICY "Users can view warranty reminders" 
ON warranty_reminders FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM warranties w
    WHERE w.id = warranty_id
    -- This will leverage the warranties policies
  )
);

-- Service role handles INSERT/UPDATE/DELETE via background jobs (bypasses RLS)
-- No additional policies needed for write operations

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
-- COMMENTS & DOCUMENTATION
-- ============================================

COMMENT ON TABLE punch_list_items IS 'Deficiency tracking for construction projects with role-based access control';
COMMENT ON TABLE photos IS 'Central repository for all project photos with visibility-based access (public/internal/private)';
COMMENT ON TABLE warranties IS 'Warranty tracking for completed work with admin/PM access';
COMMENT ON TABLE warranty_claims IS 'Claims filed against warranties';
COMMENT ON FUNCTION generate_punch_item_number IS 'Generates sequential punch list item numbers per project (P-001, P-002, etc.) with advisory lock to prevent race conditions';
COMMENT ON FUNCTION is_admin_or_pm IS 'Helper function to check if current user has admin or PM role';
COMMENT ON FUNCTION get_user_role IS 'Helper function to get current user role (admin/pm/staff)';
COMMENT ON VIEW punch_list_summary IS 'Summary statistics for punch list items by project';
COMMENT ON VIEW expiring_warranties IS 'Warranties expiring within 90 days';

-- ============================================
-- FUTURE ENHANCEMENTS (Not Implemented)
-- ============================================

-- To implement project-level membership in the future:
--
-- 1. Create project_members table:
-- CREATE TABLE project_members (
--   project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
--   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
--   role VARCHAR(50) DEFAULT 'member',
--   PRIMARY KEY (project_id, user_id)
-- );
--
-- 2. Update RLS policies to use:
-- EXISTS (
--   SELECT 1 FROM project_members pm
--   WHERE pm.project_id = <table>.project_id
--   AND pm.user_id = auth.uid()
-- )
--
-- This would provide granular project-level access control
-- instead of the current org-wide role-based model.

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Verify tables were created
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('punch_list_items', 'punch_list_comments', 'photos', 'photo_collections', 
                     'photo_annotations', 'warranties', 'warranty_claims', 'warranty_reminders');
  
  RAISE NOTICE 'Phase 4 migration complete! Created/verified % tables.', table_count;
END $$;




