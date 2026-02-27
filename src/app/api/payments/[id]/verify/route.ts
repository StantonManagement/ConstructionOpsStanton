import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import {
  withAuth,
  successResponse,
  errorResponse,
  validateRequestBody,
  APIError
} from '@/lib/apiHelpers';

/**
 * GET /api/payments/[id]/verify
 * Get all data needed for PM to verify a payment application:
 * - Payment application details
 * - Project and contractor info
 * - Line items with progress data
 * - Associated photos
 */
export const GET = withAuth(async (request: NextRequest, context: any, user: any) => {
  try {
    if (!supabaseAdmin) {
      return errorResponse('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const paymentAppId = parseInt(params.id);

    if (!paymentAppId || isNaN(paymentAppId)) {
      return errorResponse('Valid payment application ID is required', 400, 'VALIDATION_ERROR');
    }

    // Fetch payment application with related data
    const { data: paymentApp, error: appError } = await supabaseAdmin
      .from('payment_applications')
      .select(`
        *,
        project:projects(*),
        contractor:contractors(*)
      `)
      .eq('id', paymentAppId)
      .single();

    if (appError || !paymentApp) {
      console.error('[Payment Verify GET] Error fetching payment app:', appError);
      return errorResponse('Payment application not found', 404, 'NOT_FOUND');
    }

    // Fetch line items with progress
    const { data: lineItems, error: lineItemsError } = await supabaseAdmin
      .from('payment_line_item_progress')
      .select(`
        *,
        line_item:project_line_items(*)
      `)
      .eq('payment_app_id', paymentAppId)
      .order('id', { ascending: true });

    if (lineItemsError) {
      console.error('[Payment Verify GET] Error fetching line items:', lineItemsError);
    }

    // Fetch photos
    const { data: photos, error: photosError } = await supabaseAdmin
      .from('photos')
      .select('*')
      .eq('payment_app_id', paymentAppId)
      .order('created_at', { ascending: false });

    if (photosError) {
      console.error('[Payment Verify GET] Error fetching photos:', photosError);
    }

    return successResponse({
      paymentApp,
      lineItems: lineItems || [],
      photos: photos || [],
      summary: {
        total_line_items: lineItems?.length || 0,
        total_photos: photos?.length || 0,
        status: paymentApp.status,
      },
    });
  } catch (error) {
    console.error('[Payment Verify GET] Exception:', error);
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
});

/**
 * PUT /api/payments/[id]/verify
 * Batch update line item verification percentages
 * Optionally mark payment as ready for approval
 *
 * Body:
 * - lineItemUpdates: Array of { line_item_id, pm_verified_percent }
 * - mark_ready: boolean (optional) - mark payment as ready for approval
 */
export const PUT = withAuth(async (request: NextRequest, context: any, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const paymentAppId = parseInt(params.id);

    if (!paymentAppId || isNaN(paymentAppId)) {
      throw new APIError('Valid payment application ID is required', 400, 'VALIDATION_ERROR');
    }

    const body = await request.json();
    const { lineItemUpdates, mark_ready } = body;

    if (!lineItemUpdates || !Array.isArray(lineItemUpdates)) {
      throw new APIError('lineItemUpdates array is required', 400, 'VALIDATION_ERROR');
    }

    // Verify payment application exists
    const { data: paymentApp, error: appError } = await supabaseAdmin
      .from('payment_applications')
      .select('id, status')
      .eq('id', paymentAppId)
      .single();

    if (appError || !paymentApp) {
      throw new APIError('Payment application not found', 404, 'NOT_FOUND');
    }

    // Prevent updates to already approved/rejected payments
    if (paymentApp.status === 'approved' || paymentApp.status === 'rejected') {
      throw new APIError(
        `Cannot update ${paymentApp.status} payment application`,
        400,
        'INVALID_STATUS'
      );
    }

    // Batch update line items
    const updatePromises = lineItemUpdates.map(async (update: any) => {
      const { line_item_id, pm_verified_percent } = update;

      // Validate percentage
      if (pm_verified_percent < 0 || pm_verified_percent > 100) {
        throw new APIError(
          `Invalid percentage for line item ${line_item_id}: ${pm_verified_percent}`,
          400,
          'VALIDATION_ERROR'
        );
      }

      if (!supabaseAdmin) {
        throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
      }

      return supabaseAdmin
        .from('payment_line_item_progress')
        .update({
          pm_verified_percent,
          updated_at: new Date().toISOString(),
        })
        .eq('payment_app_id', paymentAppId)
        .eq('line_item_id', line_item_id);
    });

    const results = await Promise.all(updatePromises);

    // Check for errors
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error('[Payment Verify PUT] Errors updating line items:', errors);
      throw new APIError('Failed to update some line items', 500, 'DATABASE_ERROR');
    }

    // If mark_ready is true, update payment status to 'verified'
    let updatedPaymentApp = paymentApp;
    if (mark_ready) {
      const { data, error } = await supabaseAdmin
        .from('payment_applications')
        .update({
          status: 'verified',
          verified_by: user.id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', paymentAppId)
        .select()
        .single();

      if (error) {
        console.error('[Payment Verify PUT] Error marking as ready:', error);
      } else {
        updatedPaymentApp = data;
      }
    }

    // Log the verification action
    try {
      await supabaseAdmin
        .from('payment_approval_logs')
        .insert({
          payment_app_id: paymentAppId,
          action: mark_ready ? 'verified' : 'updated',
          performed_by: user.id,
          notes: `Updated ${lineItemUpdates.length} line item(s)`,
          created_at: new Date().toISOString(),
        });
    } catch (logError) {
      console.log('Note: payment_approval_logs table not found, skipping log entry');
    }

    return successResponse({
      message: 'Line items updated successfully',
      updated_count: lineItemUpdates.length,
      payment_status: updatedPaymentApp.status,
    });
  } catch (error) {
    console.error('[Payment Verify PUT] Exception:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
});