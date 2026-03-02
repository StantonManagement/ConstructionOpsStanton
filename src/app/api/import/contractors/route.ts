import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * POST /api/import/contractors
 * Import contractors from CSV data
 *
 * Expected body format:
 * {
 *   "contractors": [
 *     {
 *       "contractor_name": "Smith Electric",
 *       "trade": "Electrical",
 *       "phone": "+1 (555) 123-4567",
 *       "email": "contact@smithelectric.com",
 *       "status": "active",
 *       "performance_score": "90",
 *       "notes": "Primary electrician"
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
    const { contractors, replaceExisting = false } = body;

    if (!contractors || !Array.isArray(contractors)) {
      throw new APIError('Contractors array is required', 400, 'VALIDATION_ERROR');
    }

    // Validate data
    const validatedContractors = [];
    const errors = [];

    for (let i = 0; i < contractors.length; i++) {
      const contractor = contractors[i];
      const rowNum = i + 2; // Account for header row

      try {
        // Validate required fields
        if (!contractor.contractor_name?.trim()) {
          throw new Error(`Row ${rowNum}: contractor_name is required`);
        }

        if (!contractor.trade?.trim()) {
          throw new Error(`Row ${rowNum}: trade is required`);
        }

        // Validate email format if provided
        if (contractor.email && contractor.email.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(contractor.email)) {
            throw new Error(`Row ${rowNum}: email format is invalid`);
          }
        }

        // Validate performance score if provided
        let performanceScore = null;
        if (contractor.performance_score) {
          const score = parseFloat(contractor.performance_score);
          if (isNaN(score) || score < 0 || score > 100) {
            throw new Error(`Row ${rowNum}: performance_score must be between 0 and 100`);
          }
          performanceScore = score;
        }

        // Build validated contractor object
        const validatedContractor = {
          name: contractor.contractor_name.trim(),
          trade: contractor.trade.trim(),
          phone: contractor.phone?.trim() || '',
          email: contractor.email?.trim() || '',
          status: contractor.status?.trim() || 'active',
          performance_score: performanceScore,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        validatedContractors.push(validatedContractor);
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

    // If replaceExisting, delete all existing contractors first
    if (replaceExisting) {
      console.log('[Import Contractors] Deleting existing contractors...');
      const { error: deleteError } = await supabaseAdmin
        .from('contractors')
        .delete()
        .neq('id', '0'); // Delete all contractors

      if (deleteError) {
        console.error('[Import Contractors] Delete error:', deleteError);
        throw new APIError('Failed to delete existing contractors', 500, 'DATABASE_ERROR');
      }
    }

    // Insert contractors
    console.log(`[Import Contractors] Inserting ${validatedContractors.length} contractors...`);
    const { data: insertedContractors, error: insertError } = await supabaseAdmin
      .from('contractors')
      .insert(validatedContractors)
      .select();

    if (insertError) {
      console.error('[Import Contractors] Insert error:', insertError);
      throw new APIError(
        insertError.message || 'Failed to insert contractors',
        500,
        'DATABASE_ERROR'
      );
    }

    console.log(`[Import Contractors] Successfully imported ${insertedContractors.length} contractors`);

    return successResponse({
      message: `Successfully imported ${insertedContractors.length} contractors`,
      imported: insertedContractors.length,
      contractors: insertedContractors,
    }, 201);
  } catch (error) {
    console.error('[Import Contractors] Error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to import contractors',
      500,
      'INTERNAL_ERROR'
    );
  }
});
