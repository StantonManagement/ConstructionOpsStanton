import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * POST /api/import/projects
 * Import projects from CSV data
 *
 * Expected body format:
 * {
 *   "projects": [
 *     {
 *       "project_name": "Studio at Weston",
 *       "address": "123 Main St",
 *       "client_name": "John Doe",
 *       "budget": "500000",
 *       "start_date": "2024-01-01",
 *       "target_completion_date": "2024-12-31",
 *       "current_phase": "Rough-In",
 *       "status": "active",
 *       "project_type": "renovation",
 *       "portfolio_name": "Park Portfolio",
 *       "total_units": "1",
 *       "notes": "Main project"
 *     }
 *   ]
 * }
 */
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const body = await request.json();
    const { projects, replaceExisting = false } = body;

    if (!projects || !Array.isArray(projects)) {
      throw new APIError('Projects array is required', 400, 'VALIDATION_ERROR');
    }

    // Validate data
    const validatedProjects = [];
    const errors = [];

    for (let i = 0; i < projects.length; i++) {
      const proj = projects[i];
      const rowNum = i + 2; // Account for header row

      try {
        // Validate required fields
        if (!proj.project_name?.trim()) {
          throw new Error(`Row ${rowNum}: project_name is required`);
        }

        if (!proj.budget || isNaN(parseFloat(proj.budget))) {
          throw new Error(`Row ${rowNum}: budget must be a valid number`);
        }

        // Parse and validate dates
        const startDate = new Date(proj.start_date);
        const targetDate = new Date(proj.target_completion_date);

        if (isNaN(startDate.getTime())) {
          throw new Error(`Row ${rowNum}: start_date is invalid (use YYYY-MM-DD format)`);
        }

        if (isNaN(targetDate.getTime())) {
          throw new Error(`Row ${rowNum}: target_completion_date is invalid (use YYYY-MM-DD format)`);
        }

        // Build validated project object
        const validatedProject = {
          name: proj.project_name.trim(),
          address: proj.address?.trim() || '',
          client_name: proj.client_name?.trim() || '',
          budget: parseFloat(proj.budget),
          start_date: proj.start_date,
          target_completion_date: proj.target_completion_date,
          current_phase: proj.current_phase?.trim() || 'Planning',
          status: proj.status?.trim() || 'active',
          portfolio_name: proj.portfolio_name?.trim() || null,
          total_units: proj.total_units ? parseInt(proj.total_units) : 1,
          // Note: owner_entity_id would need to be set separately or looked up
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        validatedProjects.push(validatedProject);
      } catch (err) {
        errors.push(err instanceof Error ? err.message : `Row ${rowNum}: Unknown error`);
      }
    }

    // If there are validation errors, return them
    if (errors.length > 0) {
      return errorResponse(
        `Validation failed for ${errors.length} row(s)`,
        400,
        'VALIDATION_ERROR',
        { errors }
      );
    }

    // If replaceExisting, delete all existing projects first
    if (replaceExisting) {
      console.log('[Import Projects] Deleting existing projects...');
      const { error: deleteError } = await supabaseAdmin
        .from('projects')
        .delete()
        .neq('id', '0'); // Delete all projects

      if (deleteError) {
        console.error('[Import Projects] Delete error:', deleteError);
        throw new APIError('Failed to delete existing projects', 500, 'DATABASE_ERROR');
      }
    }

    // Insert projects
    console.log(`[Import Projects] Inserting ${validatedProjects.length} projects...`);
    const { data: insertedProjects, error: insertError } = await supabaseAdmin
      .from('projects')
      .insert(validatedProjects)
      .select();

    if (insertError) {
      console.error('[Import Projects] Insert error:', insertError);
      throw new APIError(
        insertError.message || 'Failed to insert projects',
        500,
        'DATABASE_ERROR'
      );
    }

    console.log(`[Import Projects] Successfully imported ${insertedProjects.length} projects`);

    return successResponse({
      message: `Successfully imported ${insertedProjects.length} projects`,
      imported: insertedProjects.length,
      projects: insertedProjects,
    }, 201);
  } catch (error) {
    console.error('[Import Projects] Error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to import projects',
      500,
      'INTERNAL_ERROR'
    );
  }
});
