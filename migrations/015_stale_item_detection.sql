-- ============================================
-- STALE ITEM DETECTION
-- ============================================
-- Purpose: Detect and mark action items that have been deprioritized and ignored
-- Date: March 6, 2026
-- Task 17: Stale Item Detection
-- ============================================

-- ============================================
-- FUNCTION: Detect and Mark Stale Items
-- ============================================
-- An item is considered "stale" when:
-- 1. Priority was lowered (previous_priority is lower number than current)
-- 2. No updates for 3+ days since priority change
-- 3. Still open (not resolved or deferred)
-- 4. Priority is now 4 or 5 (parked/on radar)

CREATE OR REPLACE FUNCTION detect_and_mark_stale_items()
RETURNS TABLE(
  item_id BIGINT,
  title TEXT,
  project_name TEXT,
  previous_priority INTEGER,
  current_priority INTEGER,
  days_since_change INTEGER,
  marked_stale BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH stale_candidates AS (
    SELECT
      ai.id,
      ai.title,
      p.name AS project_name,
      ai.previous_priority,
      ai.priority AS current_priority,
      ai.priority_changed_at,
      DATE_PART('day', NOW() - ai.priority_changed_at) AS days_since_change,
      ai.updated_at,
      DATE_PART('day', NOW() - ai.updated_at) AS days_since_update
    FROM action_items ai
    INNER JOIN projects p ON p.id = ai.project_id
    WHERE ai.status NOT IN ('resolved', 'deferred')  -- Still active
      AND ai.priority >= 4                           -- Currently low priority (4 or 5)
      AND ai.previous_priority IS NOT NULL           -- Has priority history
      AND ai.previous_priority < ai.priority         -- Was deprioritized (lower number = higher priority)
      AND ai.priority_changed_at < NOW() - INTERVAL '3 days'  -- Changed >3 days ago
      AND ai.updated_at < NOW() - INTERVAL '3 days'  -- No updates in 3 days
      AND ai.stale = FALSE                           -- Not already marked
  ),
  updated_items AS (
    UPDATE action_items
    SET
      stale = TRUE,
      updated_at = NOW()
    FROM stale_candidates sc
    WHERE action_items.id = sc.id
    RETURNING
      action_items.id,
      action_items.title
  )
  SELECT
    sc.id AS item_id,
    sc.title,
    sc.project_name,
    sc.previous_priority,
    sc.current_priority,
    sc.days_since_change::INTEGER,
    TRUE AS marked_stale
  FROM stale_candidates sc
  INNER JOIN updated_items ui ON ui.id = sc.id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION detect_and_mark_stale_items() IS
  'Detects and marks action items as stale when they have been deprioritized (priority increased) and ignored for 3+ days';

-- ============================================
-- FUNCTION: Unmark Stale Items
-- ============================================
-- Automatically unmark items as stale when they are:
-- 1. Updated (any change to the item)
-- 2. Priority is increased (re-prioritized)
-- 3. Resolved or deferred

CREATE OR REPLACE FUNCTION unmark_stale_items()
RETURNS TABLE(
  item_id BIGINT,
  title TEXT,
  reason TEXT,
  unmarked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH items_to_unmark AS (
    SELECT
      ai.id,
      ai.title,
      CASE
        WHEN ai.status IN ('resolved', 'deferred') THEN 'status_changed'
        WHEN ai.priority < 4 THEN 'priority_increased'
        WHEN ai.updated_at > NOW() - INTERVAL '1 day' THEN 'recently_updated'
        ELSE 'unknown'
      END AS unmark_reason
    FROM action_items ai
    WHERE ai.stale = TRUE
      AND (
        ai.status IN ('resolved', 'deferred')  -- Item completed/deferred
        OR ai.priority < 4                      -- Priority increased
        OR ai.updated_at > NOW() - INTERVAL '1 day'  -- Recent activity
      )
  ),
  updated_items AS (
    UPDATE action_items
    SET
      stale = FALSE,
      updated_at = NOW()
    FROM items_to_unmark itu
    WHERE action_items.id = itu.id
    RETURNING
      action_items.id,
      action_items.title
  )
  SELECT
    itu.id AS item_id,
    itu.title,
    itu.unmark_reason AS reason,
    TRUE AS unmarked
  FROM items_to_unmark itu
  INNER JOIN updated_items ui ON ui.id = itu.id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION unmark_stale_items() IS
  'Automatically unmarks items as stale when they are updated, re-prioritized, or resolved';

-- ============================================
-- FUNCTION: Run Complete Stale Detection
-- ============================================
-- This function runs both marking and unmarking in sequence

CREATE OR REPLACE FUNCTION run_stale_detection()
RETURNS TABLE(
  action TEXT,
  items_affected INTEGER,
  details JSONB
) AS $$
DECLARE
  v_marked_count INTEGER;
  v_unmarked_count INTEGER;
  v_marked_details JSONB;
  v_unmarked_details JSONB;
BEGIN
  -- First, unmark items that should no longer be stale
  WITH unmarked AS (
    SELECT * FROM unmark_stale_items()
  )
  SELECT
    COUNT(*),
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'id', item_id,
        'title', title,
        'reason', reason
      )
    )
  INTO v_unmarked_count, v_unmarked_details
  FROM unmarked;

  -- Then, mark new stale items
  WITH marked AS (
    SELECT * FROM detect_and_mark_stale_items()
  )
  SELECT
    COUNT(*),
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'id', item_id,
        'title', title,
        'project', project_name,
        'previous_priority', previous_priority,
        'current_priority', current_priority,
        'days_since_change', days_since_change
      )
    )
  INTO v_marked_count, v_marked_details
  FROM marked;

  -- Return summary
  RETURN QUERY
  SELECT 'unmarked'::TEXT, v_unmarked_count, COALESCE(v_unmarked_details, '[]'::JSONB)
  UNION ALL
  SELECT 'marked'::TEXT, v_marked_count, COALESCE(v_marked_details, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION run_stale_detection() IS
  'Runs complete stale detection: first unmarks items that should no longer be stale, then marks new stale items';

-- ============================================
-- FUNCTION: Get Stale Items Statistics
-- ============================================
-- Provides statistics about stale items

CREATE OR REPLACE FUNCTION get_stale_items_stats()
RETURNS TABLE(
  total_stale INTEGER,
  by_priority JSONB,
  by_project JSONB,
  oldest_stale_days INTEGER,
  average_stale_days NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM action_items WHERE stale = TRUE) AS total_stale,

    -- Stale items by priority
    (SELECT JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'priority', priority,
        'count', cnt
      )
    )
    FROM (
      SELECT priority, COUNT(*) AS cnt
      FROM action_items
      WHERE stale = TRUE
      GROUP BY priority
      ORDER BY priority
    ) sub1) AS by_priority,

    -- Stale items by project
    (SELECT JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'project_id', project_id,
        'project_name', project_name,
        'count', cnt
      )
    )
    FROM (
      SELECT
        ai.project_id,
        p.name AS project_name,
        COUNT(*) AS cnt
      FROM action_items ai
      INNER JOIN projects p ON p.id = ai.project_id
      WHERE ai.stale = TRUE
      GROUP BY ai.project_id, p.name
      ORDER BY cnt DESC
      LIMIT 10
    ) sub2) AS by_project,

    -- Oldest stale item
    (SELECT
      DATE_PART('day', NOW() - MIN(priority_changed_at))::INTEGER
    FROM action_items
    WHERE stale = TRUE) AS oldest_stale_days,

    -- Average days stale
    (SELECT
      ROUND(AVG(DATE_PART('day', NOW() - priority_changed_at)), 1)
    FROM action_items
    WHERE stale = TRUE) AS average_stale_days;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_stale_items_stats() IS
  'Returns statistics about stale action items including counts, distributions, and age metrics';

-- ============================================
-- TRIGGER: Auto-unmark on Update
-- ============================================
-- Automatically unmark an item as stale when it's updated

CREATE OR REPLACE FUNCTION trigger_unmark_stale_on_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If the item is currently stale and any of these conditions are met, unmark it:
  -- 1. Priority was increased (decreased number)
  -- 2. Status changed to resolved or deferred
  -- 3. Any field was updated (which means someone is paying attention to it)

  IF OLD.stale = TRUE THEN
    -- Priority increased (lower number = higher priority)
    IF NEW.priority < OLD.priority THEN
      NEW.stale := FALSE;
    END IF;

    -- Status changed to resolved or deferred
    IF NEW.status IN ('resolved', 'deferred') AND OLD.status NOT IN ('resolved', 'deferred') THEN
      NEW.stale := FALSE;
    END IF;

    -- Title or description changed (meaningful update)
    IF NEW.title != OLD.title OR
       (NEW.description IS NOT NULL AND OLD.description IS NOT NULL AND NEW.description != OLD.description) OR
       (NEW.description IS NOT NULL AND OLD.description IS NULL) THEN
      NEW.stale := FALSE;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_unmark_stale_on_update ON action_items;
CREATE TRIGGER trigger_unmark_stale_on_update
  BEFORE UPDATE ON action_items
  FOR EACH ROW
  EXECUTE FUNCTION trigger_unmark_stale_on_update();

COMMENT ON TRIGGER trigger_unmark_stale_on_update ON action_items IS
  'Automatically unmarks stale items when they are meaningfully updated';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify functions exist
SELECT
  proname AS function_name,
  pg_get_functiondef(oid) IS NOT NULL AS definition_exists
FROM pg_proc
WHERE proname LIKE '%stale%'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

-- Test stale detection (dry run)
SELECT * FROM run_stale_detection();

-- View current stale items statistics
SELECT * FROM get_stale_items_stats();
