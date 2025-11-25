-- Step 1: Create Tables Only
-- Run this first

CREATE TABLE IF NOT EXISTS punch_list_items (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  due_date DATE,
  location_area VARCHAR(255),
  status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'complete', 'verified')),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  assigned_by INTEGER,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by INTEGER,
  contractor_notes TEXT,
  gc_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS punch_list_photos (
  id SERIAL PRIMARY KEY,
  punch_list_item_id INTEGER NOT NULL REFERENCES punch_list_items(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  uploaded_by VARCHAR(20) CHECK (uploaded_by IN ('contractor', 'gc')),
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS contractor_portal_tokens (
  id SERIAL PRIMARY KEY,
  contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

