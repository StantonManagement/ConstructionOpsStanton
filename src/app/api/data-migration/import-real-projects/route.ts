import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * POST /api/data-migration/import-real-projects
 * Import real project data from structured JSON
 *
 * Body:
 * {
 *   "projects": [
 *     {
 *       "name": "Studio at Weston",
 *       "address": "123 Main St",
 *       "city": "Boston",
 *       "state": "MA",
 *       "zip": "02101",
 *       "type": "renovation",
 *       "client_name": "John Doe",
 *       "client_phone": "555-1234",
 *       "client_email": "john@example.com",
 *       "start_date": "2026-01-15",
 *       "completion_date": "2026-06-30",
 *       "phase": "rough_in",
 *       "completion_percentage": 45,
 *       "total_budget": 250000,
 *       "budget_spent": 112500,
 *       "project_manager": "Dan",
 *       "description": "Studio addition to existing home",
 *       "contractors": [
 *         {
 *           "company": "ABC Plumbing",
 *           "trade": "Plumbing",
 *           "contact_person": "Mike",
 *           "phone": "555-5678",
 *           "email": "mike@abcplumbing.com",
 *           "budget": 35000
 *         }
 *       ],
 *       "action_items": [
 *         {
 *           "title": "Call inspector about final inspection",
 *           "description": "Need to schedule final plumbing inspection",
 *           "priority": 1,
 *           "type": "waiting_on_external",
 *           "status": "open",
 *           "waiting_on": "Building Inspector",
 *           "follow_up_date": "2026-03-10"
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
export const POST = withAuth(async (request: NextRequest, user: unknown) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const body = await request.json();
    const { projects, dry_run = false } = body;

    if (!Array.isArray(projects) || projects.length === 0) {
      throw new APIError('Projects array is required', 400, 'VALIDATION_ERROR');
    }

    const results = {
      projects_imported: 0,
      contractors_imported: 0,
      action_items_imported: 0,
      errors: [] as string[],
      dry_run
    };

    // Validate user has admin role
    const authenticatedUser = user as { id: number };
    const { data: userRole } = await supabaseAdmin
      .from('user_role')
      .select('role')
      .eq('user_id', authenticatedUser.id)
      .single();

    if (!userRole || userRole.role !== 'admin') {
      throw new APIError('Admin access required for data migration', 403, 'FORBIDDEN');
    }

    for (const projectData of projects) {
      try {
        // Validate required fields
        if (!projectData.name) {
          results.errors.push(`Project missing name: ${JSON.stringify(projectData)}`);
          continue;
        }

        if (dry_run) {
          console.log('[DRY RUN] Would import project:', projectData.name);
          results.projects_imported++;
          continue;
        }

        // 1. Insert Project
        const { data: project, error: projectError } = await supabaseAdmin
          .from('projects')
          .insert({
            name: projectData.name,
            address: projectData.address || null,
            city: projectData.city || null,
            state: projectData.state || null,
            zip_code: projectData.zip || null,
            type: projectData.type || 'renovation',
            status: projectData.phase || 'in_progress',
            start_date: projectData.start_date || null,
            completion_date: projectData.completion_date || null,
            completion_percentage: projectData.completion_percentage || 0,
            description: projectData.description || null,
            client_name: projectData.client_name || null,
            client_phone: projectData.client_phone || null,
            client_email: projectData.client_email || null,
            project_manager: projectData.project_manager || null,
            created_by_user_id: authenticatedUser.id
          })
          .select()
          .single();

        if (projectError || !project) {
          results.errors.push(`Failed to import project ${projectData.name}: ${projectError?.message}`);
          continue;
        }

        results.projects_imported++;

        // 2. Insert Budget (if budget data provided)
        if (projectData.total_budget) {
          const { error: budgetError } = await supabaseAdmin
            .from('budgets')
            .insert({
              project_id: project.id,
              total_amount: projectData.total_budget,
              spent_amount: projectData.budget_spent || 0,
              remaining_amount: projectData.total_budget - (projectData.budget_spent || 0)
            });

          if (budgetError) {
            results.errors.push(`Failed to create budget for ${projectData.name}: ${budgetError.message}`);
          }
        }

        // 3. Insert Contractors and Assignments
        if (Array.isArray(projectData.contractors)) {
          for (const contractorData of projectData.contractors) {
            try {
              // Check if contractor exists
              let { data: existingContractor } = await supabaseAdmin
                .from('contractors')
                .select('id')
                .eq('company', contractorData.company)
                .maybeSingle();

              let contractorId: number;

              if (!existingContractor) {
                // Create new contractor
                const { data: newContractor, error: contractorError } = await supabaseAdmin
                  .from('contractors')
                  .insert({
                    company: contractorData.company,
                    trade: contractorData.trade || null,
                    contact_person: contractorData.contact_person || null,
                    phone: contractorData.phone || null,
                    email: contractorData.email || null
                  })
                  .select()
                  .single();

                if (contractorError || !newContractor) {
                  results.errors.push(`Failed to create contractor ${contractorData.company}: ${contractorError?.message}`);
                  continue;
                }

                contractorId = newContractor.id;
                results.contractors_imported++;
              } else {
                contractorId = existingContractor.id;
              }

              // Assign contractor to project
              const { error: assignmentError } = await supabaseAdmin
                .from('project_contractors')
                .insert({
                  project_id: project.id,
                  contractor_id: contractorId,
                  trade: contractorData.trade || null,
                  budget_amount: contractorData.budget || null,
                  status: 'active'
                });

              if (assignmentError) {
                results.errors.push(`Failed to assign ${contractorData.company} to ${projectData.name}: ${assignmentError.message}`);
              }
            } catch (contractorError) {
              results.errors.push(`Error processing contractor ${contractorData.company}: ${contractorError}`);
            }
          }
        }

        // 4. Insert Action Items (for consolidated dashboard)
        if (Array.isArray(projectData.action_items)) {
          for (const actionItem of projectData.action_items) {
            try {
              const { error: actionItemError } = await supabaseAdmin
                .from('action_items')
                .insert({
                  project_id: project.id,
                  title: actionItem.title,
                  description: actionItem.description || null,
                  priority: actionItem.priority || 3,
                  type: actionItem.type || 'general',
                  status: actionItem.status || 'open',
                  waiting_on: actionItem.waiting_on || null,
                  follow_up_date: actionItem.follow_up_date || null,
                  assigned_to_user_id: authenticatedUser.id,
                  source: 'manual'
                });

              if (actionItemError) {
                results.errors.push(`Failed to create action item for ${projectData.name}: ${actionItemError.message}`);
              } else {
                results.action_items_imported++;
              }
            } catch (actionItemError) {
              results.errors.push(`Error processing action item: ${actionItemError}`);
            }
          }
        }

      } catch (projectError) {
        results.errors.push(`Error processing project ${projectData.name}: ${projectError}`);
      }
    }

    return successResponse({
      message: dry_run ? 'Dry run complete - no data was imported' : 'Real project data imported successfully',
      results
    }, 201);

  } catch (error) {
    console.error('[POST /api/data-migration/import-real-projects] Error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to import real project data',
      500,
      'INTERNAL_ERROR'
    );
  }
});

/**
 * GET /api/data-migration/import-real-projects
 * Get import status and preview what would be imported
 */
export const GET = withAuth(async (request: NextRequest, user: unknown) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    // Get current data counts
    const { count: projectCount } = await supabaseAdmin
      .from('projects')
      .select('*', { count: 'exact', head: true });

    const { count: contractorCount } = await supabaseAdmin
      .from('contractors')
      .select('*', { count: 'exact', head: true });

    const { count: actionItemCount } = await supabaseAdmin
      .from('action_items')
      .select('*', { count: 'exact', head: true });

    return successResponse({
      current_data: {
        projects: projectCount || 0,
        contractors: contractorCount || 0,
        action_items: actionItemCount || 0
      },
      instructions: [
        '1. Fill out REAL_PROJECT_DATA_TEMPLATE.md with Dan\'s 10 active projects',
        '2. Convert template data to JSON format',
        '3. Run with dry_run=true first to validate',
        '4. Backup database before importing',
        '5. Run purge script (012_purge_test_data.sql) if needed',
        '6. Import real data with dry_run=false',
        '7. Verify data accuracy with Dan'
      ],
      template_location: 'docs/REAL_PROJECT_DATA_TEMPLATE.md',
      purge_script: 'migrations/012_purge_test_data.sql'
    });

  } catch (error) {
    console.error('[GET /api/data-migration/import-real-projects] Error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to get import status',
      500,
      'INTERNAL_ERROR'
    );
  }
});
