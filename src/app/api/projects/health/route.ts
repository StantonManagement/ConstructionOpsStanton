import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * Project Health Status Type
 */
export type BudgetHealth = 'healthy' | 'warning' | 'critical';
export type TimelineHealth = 'on_track' | 'at_risk' | 'behind';

export interface ProjectHealth {
  id: string;
  name: string;
  client_name: string;
  current_phase: string;
  status: string;

  // Budget metrics
  budget: number;
  spent: number;
  budgetPercentUsed: number;
  budgetRemaining: number;
  budgetHealth: BudgetHealth;

  // Timeline metrics
  start_date: string | null;
  target_completion_date: string | null;
  daysTotal: number | null;
  daysElapsed: number | null;
  daysRemaining: number | null;
  timelinePercentElapsed: number | null;
  timelineHealth: TimelineHealth;

  // Completion metrics
  completionPercentage: number;

  // Action items count
  openActionItemsCount: number;
  criticalActionItemsCount: number;

  // Overall health score (0-100)
  healthScore: number;
}

/**
 * Calculate budget health status
 */
function calculateBudgetHealth(percentUsed: number): BudgetHealth {
  if (percentUsed >= 90) return 'critical';
  if (percentUsed >= 75) return 'warning';
  return 'healthy';
}

/**
 * Calculate timeline health status
 */
function calculateTimelineHealth(
  timelinePercentElapsed: number | null,
  completionPercentage: number
): TimelineHealth {
  if (timelinePercentElapsed === null) return 'on_track'; // No timeline set

  const variance = timelinePercentElapsed - completionPercentage;

  if (variance > 20) return 'behind'; // More than 20% behind schedule
  if (variance > 10) return 'at_risk'; // 10-20% behind schedule
  return 'on_track';
}

/**
 * Calculate overall health score (0-100)
 */
function calculateHealthScore(
  budgetHealth: BudgetHealth,
  timelineHealth: TimelineHealth,
  openActionItems: number,
  criticalActionItems: number
): number {
  let score = 100;

  // Budget health impact (max -40 points)
  if (budgetHealth === 'critical') score -= 40;
  else if (budgetHealth === 'warning') score -= 20;

  // Timeline health impact (max -30 points)
  if (timelineHealth === 'behind') score -= 30;
  else if (timelineHealth === 'at_risk') score -= 15;

  // Action items impact (max -30 points)
  score -= Math.min(criticalActionItems * 10, 20); // Critical items: -10 each, max -20
  score -= Math.min(openActionItems * 2, 10); // Open items: -2 each, max -10

  return Math.max(0, score);
}

/**
 * GET /api/projects/health
 * Get health metrics for all projects
 */
export const GET = withAuth(async (request: NextRequest, user: unknown) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    // Fetch all projects with their stats
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select(`
        id,
        name,
        client_name,
        current_phase,
        status,
        budget,
        start_date,
        target_completion_date
      `)
      .order('name', { ascending: true });

    if (projectsError) {
      console.error('[Projects Health API] Projects query error:', projectsError);
      throw new APIError(projectsError.message || 'Failed to fetch projects', 500, 'DATABASE_ERROR');
    }

    if (!projects || projects.length === 0) {
      return successResponse({ projects: [] });
    }

    // Fetch project stats (completion percentage and spent amount)
    const { data: stats, error: statsError } = await supabaseAdmin
      .from('project_stats')
      .select('project_id, completion_percentage, verified_cost');

    if (statsError) {
      console.error('[Projects Health API] Stats query error:', statsError);
      // Continue without stats rather than failing
    }

    // Create stats lookup map
    const statsMap = new Map();
    if (stats) {
      stats.forEach((stat: Record<string, unknown>) => {
        statsMap.set(stat.project_id, stat);
      });
    }

    // Fetch action items counts for each project
    const { data: actionItems, error: actionItemsError } = await supabaseAdmin
      .from('action_items')
      .select('project_id, priority, status');

    if (actionItemsError) {
      console.error('[Projects Health API] Action items query error:', actionItemsError);
      // Continue without action items rather than failing
    }

    // Create action items lookup map
    const actionItemsMap = new Map<string, { open: number; critical: number }>();
    if (actionItems) {
      actionItems.forEach((item: Record<string, unknown>) => {
        const projectId = String(item.project_id);
        const status = item.status as string;
        const priority = item.priority as number;

        if (!actionItemsMap.has(projectId)) {
          actionItemsMap.set(projectId, { open: 0, critical: 0 });
        }

        const counts = actionItemsMap.get(projectId)!;
        if (status !== 'resolved') {
          counts.open += 1;
          if (priority <= 2) {
            counts.critical += 1;
          }
        }
      });
    }

    // Calculate health metrics for each project
    const healthData: ProjectHealth[] = projects.map((project: Record<string, unknown>) => {
      const projectId = String(project.id);
      const projectStats = statsMap.get(projectId);
      const actionItemCounts = actionItemsMap.get(projectId) || { open: 0, critical: 0 };

      // Budget calculations
      const budget = Number(project.budget) || 0;
      const spent = projectStats ? Number(projectStats.verified_cost) || 0 : 0;
      const budgetPercentUsed = budget > 0 ? (spent / budget) * 100 : 0;
      const budgetRemaining = budget - spent;
      const budgetHealth = calculateBudgetHealth(budgetPercentUsed);

      // Timeline calculations
      const startDate = project.start_date as string | null;
      const targetDate = project.target_completion_date as string | null;
      let daysTotal: number | null = null;
      let daysElapsed: number | null = null;
      let daysRemaining: number | null = null;
      let timelinePercentElapsed: number | null = null;

      if (startDate && targetDate) {
        const start = new Date(startDate);
        const target = new Date(targetDate);
        const now = new Date();

        daysTotal = Math.ceil((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        daysElapsed = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        daysRemaining = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        timelinePercentElapsed = daysTotal > 0 ? (daysElapsed / daysTotal) * 100 : 0;
      }

      // Completion percentage from stats
      const completionPercentage = projectStats ? Number(projectStats.completion_percentage) || 0 : 0;

      // Timeline health
      const timelineHealth = calculateTimelineHealth(timelinePercentElapsed, completionPercentage);

      // Overall health score
      const healthScore = calculateHealthScore(
        budgetHealth,
        timelineHealth,
        actionItemCounts.open,
        actionItemCounts.critical
      );

      return {
        id: projectId,
        name: project.name as string,
        client_name: project.client_name as string,
        current_phase: project.current_phase as string,
        status: project.status as string,
        budget,
        spent,
        budgetPercentUsed: Math.round(budgetPercentUsed * 10) / 10,
        budgetRemaining,
        budgetHealth,
        start_date: startDate,
        target_completion_date: targetDate,
        daysTotal,
        daysElapsed,
        daysRemaining,
        timelinePercentElapsed: timelinePercentElapsed ? Math.round(timelinePercentElapsed * 10) / 10 : null,
        timelineHealth,
        completionPercentage: Math.round(completionPercentage * 10) / 10,
        openActionItemsCount: actionItemCounts.open,
        criticalActionItemsCount: actionItemCounts.critical,
        healthScore,
      };
    });

    return successResponse({ projects: healthData });
  } catch (error) {
    console.error('[Projects Health API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch project health data', 500, 'INTERNAL_ERROR');
  }
});
