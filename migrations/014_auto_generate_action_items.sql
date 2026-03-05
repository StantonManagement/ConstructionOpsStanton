-- ============================================
-- AUTO-GENERATE ACTION ITEMS
-- ============================================
-- Purpose: Automatically create action items based on project conditions
-- Date: March 6, 2026
-- Task 16: Auto-Generated Items
-- ============================================

-- ============================================
-- FUNCTION 1: Budget Health Action Items
-- ============================================
-- Triggers when budget >80% spent without sufficient completion
CREATE OR REPLACE FUNCTION auto_generate_budget_action_items()
RETURNS TABLE(
  project_id BIGINT,
  title TEXT,
  description TEXT,
  created BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH budget_health AS (
    SELECT
      p.id AS project_id,
      p.name AS project_name,
      COALESCE(p.budget, 0) AS budget,
      COALESCE(ps.verified_cost, 0) AS spent,
      CASE
        WHEN p.budget > 0 THEN (COALESCE(ps.verified_cost, 0) / p.budget) * 100
        ELSE 0
      END AS percent_spent,
      COALESCE(ps.completion_percentage, 0) AS completion_pct
    FROM projects p
    LEFT JOIN project_stats ps ON ps.project_id = p.id
    WHERE p.status = 'active'
      AND p.budget > 0
  ),
  high_spend_projects AS (
    SELECT
      bh.project_id,
      bh.project_name,
      bh.percent_spent,
      bh.completion_pct,
      bh.budget,
      bh.spent
    FROM budget_health bh
    WHERE bh.percent_spent > 80  -- More than 80% spent
      AND bh.completion_pct < 70  -- Less than 70% complete
      AND bh.percent_spent - bh.completion_pct > 15  -- Variance >15%
  ),
  new_items AS (
    INSERT INTO action_items (
      title,
      description,
      project_id,
      priority,
      type,
      status,
      source,
      auto_trigger
    )
    SELECT
      'Budget Alert: ' || hsp.project_name || ' - High Spending',
      FORMAT(
        'Project has spent %.1f%% of budget ($%s of $%s) but is only %.1f%% complete. Review budget allocation and completion status.',
        hsp.percent_spent,
        TO_CHAR(hsp.spent, 'FM999,999,999'),
        TO_CHAR(hsp.budget, 'FM999,999,999'),
        hsp.completion_pct
      ),
      hsp.project_id,
      2,  -- P2: Today/This Week
      'blocker',
      'open',
      'auto',
      'budget_overspend'
    FROM high_spend_projects hsp
    WHERE NOT EXISTS (
      -- Don't create duplicate action items
      SELECT 1
      FROM action_items ai
      WHERE ai.project_id = hsp.project_id
        AND ai.auto_trigger = 'budget_overspend'
        AND ai.status NOT IN ('resolved', 'deferred')
        AND ai.created_at > NOW() - INTERVAL '7 days'
    )
    RETURNING
      action_items.project_id,
      action_items.title,
      action_items.description
  )
  SELECT
    ni.project_id,
    ni.title,
    ni.description,
    TRUE AS created
  FROM new_items ni;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_generate_budget_action_items() IS
  'Auto-generates action items for projects with >80% budget spent but <70% completion';

-- ============================================
-- FUNCTION 2: Overdue Tasks Action Items
-- ============================================
-- Triggers when tasks are >3 days past scheduled_end
CREATE OR REPLACE FUNCTION auto_generate_overdue_task_action_items()
RETURNS TABLE(
  project_id BIGINT,
  title TEXT,
  description TEXT,
  created BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH overdue_tasks AS (
    SELECT
      c.project_id,
      p.name AS project_name,
      t.id AS task_id,
      t.name AS task_name,
      t.scheduled_end,
      DATE_PART('day', NOW() - t.scheduled_end::timestamp) AS days_overdue,
      c.name AS location_name
    FROM tasks t
    INNER JOIN components c ON c.id::uuid = t.location_id
    INNER JOIN projects p ON p.id = c.project_id
    WHERE t.status NOT IN ('verified')
      AND t.scheduled_end IS NOT NULL
      AND t.scheduled_end::date < CURRENT_DATE - INTERVAL '3 days'
      AND p.status = 'active'
  ),
  projects_with_overdue AS (
    SELECT
      ot.project_id,
      ot.project_name,
      COUNT(*) AS overdue_count,
      STRING_AGG(
        FORMAT('%s (%s days overdue)', ot.task_name, ot.days_overdue::INTEGER),
        CHR(10)
        ORDER BY ot.days_overdue DESC
        LIMIT 5
      ) AS task_list
    FROM overdue_tasks ot
    GROUP BY ot.project_id, ot.project_name
  ),
  new_items AS (
    INSERT INTO action_items (
      title,
      description,
      project_id,
      priority,
      type,
      status,
      source,
      auto_trigger
    )
    SELECT
      'Overdue Tasks: ' || pwo.project_name,
      FORMAT(
        'This project has %s overdue task(s). Review and update schedules:%s%s',
        pwo.overdue_count,
        CHR(10) || CHR(10),
        pwo.task_list
      ),
      pwo.project_id,
      CASE
        WHEN pwo.overdue_count > 5 THEN 1  -- P1: Drop Everything
        WHEN pwo.overdue_count > 2 THEN 2  -- P2: Today/This Week
        ELSE 3                             -- P3: Needs Push
      END,
      'blocker',
      'open',
      'auto',
      'overdue_tasks'
    FROM projects_with_overdue pwo
    WHERE NOT EXISTS (
      -- Don't create duplicate action items
      SELECT 1
      FROM action_items ai
      WHERE ai.project_id = pwo.project_id
        AND ai.auto_trigger = 'overdue_tasks'
        AND ai.status NOT IN ('resolved', 'deferred')
        AND ai.created_at > NOW() - INTERVAL '3 days'
    )
    RETURNING
      action_items.project_id,
      action_items.title,
      action_items.description
  )
  SELECT
    ni.project_id,
    ni.title,
    ni.description,
    TRUE AS created
  FROM new_items ni;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_generate_overdue_task_action_items() IS
  'Auto-generates action items for tasks that are >3 days past their scheduled end date';

-- ============================================
-- FUNCTION 3: Missing Documentation Action Items
-- ============================================
-- Triggers when no daily log photos in 7 days for active projects
CREATE OR REPLACE FUNCTION auto_generate_missing_documentation_action_items()
RETURNS TABLE(
  project_id BIGINT,
  title TEXT,
  description TEXT,
  created BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH recent_photos AS (
    SELECT DISTINCT
      dl.property_id,
      MAX(dlp.taken_at) AS last_photo_date
    FROM daily_logs dl
    INNER JOIN daily_log_photos dlp ON dlp.daily_log_id = dl.id
    WHERE dlp.taken_at > NOW() - INTERVAL '30 days'
    GROUP BY dl.property_id
  ),
  projects_missing_docs AS (
    SELECT
      pr.id AS project_id,
      pr.name AS project_name,
      pr.current_phase,
      COALESCE(
        DATE_PART('day', NOW() - rp.last_photo_date),
        999
      ) AS days_since_photo
    FROM projects pr
    LEFT JOIN properties prop ON prop.id::uuid = pr.portfolio_id::uuid
    LEFT JOIN recent_photos rp ON rp.property_id = prop.id::uuid
    WHERE pr.status = 'active'
      AND pr.current_phase NOT IN ('Planning', 'Complete')
      AND (
        rp.last_photo_date IS NULL
        OR rp.last_photo_date < NOW() - INTERVAL '7 days'
      )
  ),
  new_items AS (
    INSERT INTO action_items (
      title,
      description,
      project_id,
      priority,
      type,
      status,
      source,
      auto_trigger,
      follow_up_date
    )
    SELECT
      'Missing Documentation: ' || pmd.project_name,
      FORMAT(
        'No daily log photos have been uploaded in %s days. Phase: %s. Please document current progress with photos.',
        CASE
          WHEN pmd.days_since_photo > 900 THEN 'over 30'
          ELSE pmd.days_since_photo::INTEGER::TEXT
        END,
        pmd.current_phase
      ),
      pmd.project_id,
      CASE
        WHEN pmd.days_since_photo > 14 THEN 2  -- P2: Today/This Week
        ELSE 3                                  -- P3: Needs Push
      END,
      'verification_needed',
      'open',
      'auto',
      'missing_documentation',
      CURRENT_DATE + INTERVAL '2 days'
    FROM projects_missing_docs pmd
    WHERE NOT EXISTS (
      -- Don't create duplicate action items
      SELECT 1
      FROM action_items ai
      WHERE ai.project_id = pmd.project_id
        AND ai.auto_trigger = 'missing_documentation'
        AND ai.status NOT IN ('resolved', 'deferred')
        AND ai.created_at > NOW() - INTERVAL '7 days'
    )
    RETURNING
      action_items.project_id,
      action_items.title,
      action_items.description
  )
  SELECT
    ni.project_id,
    ni.title,
    ni.description,
    TRUE AS created
  FROM new_items ni;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_generate_missing_documentation_action_items() IS
  'Auto-generates action items for active projects without daily log photos in 7+ days';

-- ============================================
-- FUNCTION 4: Payment Applications Action Items
-- ============================================
-- Triggers when payment applications are pending review for >3 days
CREATE OR REPLACE FUNCTION auto_generate_payment_application_action_items()
RETURNS TABLE(
  project_id BIGINT,
  title TEXT,
  description TEXT,
  created BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH pending_payments AS (
    SELECT
      pa.id,
      pa.project_id,
      p.name AS project_name,
      pa.contractor_name,
      pa.amount,
      DATE_PART('day', NOW() - pa.created_at) AS days_pending
    FROM payment_applications pa
    INNER JOIN projects p ON p.id = pa.project_id
    WHERE pa.status = 'pending'
      AND pa.created_at < NOW() - INTERVAL '3 days'
      AND p.status = 'active'
  ),
  projects_with_pending AS (
    SELECT
      pp.project_id,
      pp.project_name,
      COUNT(*) AS pending_count,
      SUM(pp.amount) AS total_amount,
      STRING_AGG(
        FORMAT('%s: $%s (%s days pending)',
          pp.contractor_name,
          TO_CHAR(pp.amount, 'FM999,999'),
          pp.days_pending::INTEGER
        ),
        CHR(10)
        ORDER BY pp.days_pending DESC
        LIMIT 5
      ) AS payment_list
    FROM pending_payments pp
    GROUP BY pp.project_id, pp.project_name
  ),
  new_items AS (
    INSERT INTO action_items (
      title,
      description,
      project_id,
      priority,
      type,
      status,
      source,
      auto_trigger,
      follow_up_date
    )
    SELECT
      'Pending Payment Review: ' || pwp.project_name,
      FORMAT(
        '%s payment application(s) pending review (Total: $%s). Review and approve/reject:%s%s',
        pwp.pending_count,
        TO_CHAR(pwp.total_amount, 'FM999,999'),
        CHR(10) || CHR(10),
        pwp.payment_list
      ),
      pwp.project_id,
      CASE
        WHEN pwp.pending_count > 3 THEN 1  -- P1: Drop Everything
        ELSE 2                             -- P2: Today/This Week
      END,
      'decision_needed',
      'open',
      'auto',
      'payment_review',
      CURRENT_DATE + INTERVAL '1 day'
    FROM projects_with_pending pwp
    WHERE NOT EXISTS (
      -- Don't create duplicate action items
      SELECT 1
      FROM action_items ai
      WHERE ai.project_id = pwp.project_id
        AND ai.auto_trigger = 'payment_review'
        AND ai.status NOT IN ('resolved', 'deferred')
        AND ai.created_at > NOW() - INTERVAL '3 days'
    )
    RETURNING
      action_items.project_id,
      action_items.title,
      action_items.description
  )
  SELECT
    ni.project_id,
    ni.title,
    ni.description,
    TRUE AS created
  FROM new_items ni;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_generate_payment_application_action_items() IS
  'Auto-generates action items for payment applications pending >3 days';

-- ============================================
-- FUNCTION 5: Upcoming Milestone Action Items
-- ============================================
-- Triggers when project target_completion_date is within 14 days
CREATE OR REPLACE FUNCTION auto_generate_upcoming_milestone_action_items()
RETURNS TABLE(
  project_id BIGINT,
  title TEXT,
  description TEXT,
  created BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH upcoming_milestones AS (
    SELECT
      p.id AS project_id,
      p.name AS project_name,
      p.target_completion_date,
      DATE_PART('day', p.target_completion_date::timestamp - NOW()) AS days_until,
      COALESCE(ps.completion_percentage, 0) AS completion_pct
    FROM projects p
    LEFT JOIN project_stats ps ON ps.project_id = p.id
    WHERE p.status = 'active'
      AND p.target_completion_date IS NOT NULL
      AND p.target_completion_date::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days'
  ),
  new_items AS (
    INSERT INTO action_items (
      title,
      description,
      project_id,
      priority,
      type,
      status,
      source,
      auto_trigger,
      follow_up_date
    )
    SELECT
      'Upcoming Deadline: ' || um.project_name,
      FORMAT(
        'Project target completion is in %s days (%s). Current completion: %.1f%%. %s',
        um.days_until::INTEGER,
        TO_CHAR(um.target_completion_date::date, 'Mon DD, YYYY'),
        um.completion_pct,
        CASE
          WHEN um.completion_pct < 80 THEN 'Review schedule and resource allocation to meet deadline.'
          ELSE 'Prepare for final inspections and closeout.'
        END
      ),
      um.project_id,
      CASE
        WHEN um.days_until <= 7 THEN 1  -- P1: Drop Everything
        ELSE 2                          -- P2: Today/This Week
      END,
      'upcoming',
      'open',
      'auto',
      'milestone_upcoming',
      um.target_completion_date::date - INTERVAL '3 days'
    FROM upcoming_milestones um
    WHERE NOT EXISTS (
      -- Don't create duplicate action items
      SELECT 1
      FROM action_items ai
      WHERE ai.project_id = um.project_id
        AND ai.auto_trigger = 'milestone_upcoming'
        AND ai.status NOT IN ('resolved', 'deferred')
        AND ai.created_at > NOW() - INTERVAL '14 days'
    )
    RETURNING
      action_items.project_id,
      action_items.title,
      action_items.description
  )
  SELECT
    ni.project_id,
    ni.title,
    ni.description,
    TRUE AS created
  FROM new_items ni;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_generate_upcoming_milestone_action_items() IS
  'Auto-generates action items for projects with target completion dates within 14 days';

-- ============================================
-- MASTER FUNCTION: Run All Auto-Generators
-- ============================================
CREATE OR REPLACE FUNCTION auto_generate_all_action_items()
RETURNS TABLE(
  trigger_type TEXT,
  projects_affected INTEGER,
  items_created INTEGER
) AS $$
DECLARE
  v_budget_count INTEGER;
  v_overdue_count INTEGER;
  v_docs_count INTEGER;
  v_payment_count INTEGER;
  v_milestone_count INTEGER;
BEGIN
  -- Run budget health check
  SELECT COUNT(*) INTO v_budget_count
  FROM auto_generate_budget_action_items();

  -- Run overdue tasks check
  SELECT COUNT(*) INTO v_overdue_count
  FROM auto_generate_overdue_task_action_items();

  -- Run missing documentation check
  SELECT COUNT(*) INTO v_docs_count
  FROM auto_generate_missing_documentation_action_items();

  -- Run payment applications check
  SELECT COUNT(*) INTO v_payment_count
  FROM auto_generate_payment_application_action_items();

  -- Run upcoming milestones check
  SELECT COUNT(*) INTO v_milestone_count
  FROM auto_generate_upcoming_milestone_action_items();

  -- Return summary
  RETURN QUERY
  SELECT 'budget_overspend'::TEXT, v_budget_count, v_budget_count
  UNION ALL
  SELECT 'overdue_tasks'::TEXT, v_overdue_count, v_overdue_count
  UNION ALL
  SELECT 'missing_documentation'::TEXT, v_docs_count, v_docs_count
  UNION ALL
  SELECT 'payment_review'::TEXT, v_payment_count, v_payment_count
  UNION ALL
  SELECT 'milestone_upcoming'::TEXT, v_milestone_count, v_milestone_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_generate_all_action_items() IS
  'Runs all auto-generation functions and returns summary of items created';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify functions exist
SELECT
  proname AS function_name,
  pg_get_functiondef(oid) IS NOT NULL AS definition_exists
FROM pg_proc
WHERE proname LIKE 'auto_generate%'
ORDER BY proname;

-- Test run (dry run - just shows what would be created)
SELECT * FROM auto_generate_all_action_items();
