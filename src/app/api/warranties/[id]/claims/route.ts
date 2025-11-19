import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { 
  withAuth, 
  successResponse, 
  errorResponse, 
  APIError 
} from '@/lib/apiHelpers';
import type { CreateClaimRequest } from '@/types/warranties';

/**
 * GET /api/warranties/[id]/claims
 * Get all claims for a warranty
 */
export const GET = withAuth(async (request: NextRequest, { params }: { params: { id: string } }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const warrantyId = parseInt(params.id);

    const { data: claims, error } = await supabaseAdmin
      .from('warranty_claims')
      .select('*')
      .eq('warranty_id', warrantyId)
      .order('claim_date', { ascending: false });

    if (error) {
      console.error('[Warranty Claims API] Error fetching claims:', error);
      throw new APIError('Failed to fetch claims', 500, 'DATABASE_ERROR');
    }

    return successResponse({ claims: claims || [] });
  } catch (error) {
    console.error('[Warranty Claims API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch claims', 500, 'INTERNAL_ERROR');
  }
});

/**
 * POST /api/warranties/[id]/claims
 * File a claim against a warranty
 */
export const POST = withAuth(async (request: NextRequest, { params }: { params: { id: string } }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const warrantyId = parseInt(params.id);
    const body: CreateClaimRequest = await request.json();

    // Validate required fields
    if (!body.issue_description) {
      throw new APIError('Issue description is required', 400, 'VALIDATION_ERROR');
    }

    // Check if warranty exists and is active
    const { data: warranty, error: warrantyError } = await supabaseAdmin
      .from('warranties')
      .select('id, status, contractor_id, end_date')
      .eq('id', warrantyId)
      .single();

    if (warrantyError || !warranty) {
      throw new APIError('Warranty not found', 404, 'NOT_FOUND');
    }

    if (warranty.status === 'expired') {
      throw new APIError('Cannot file claim on expired warranty', 400, 'INVALID_STATE');
    }

    if (warranty.status === 'void') {
      throw new APIError('Cannot file claim on void warranty', 400, 'INVALID_STATE');
    }

    // Create claim
    const { data: claim, error: claimError } = await supabaseAdmin
      .from('warranty_claims')
      .insert({
        warranty_id: warrantyId,
        punch_item_id: body.punch_item_id,
        issue_description: body.issue_description,
        claim_amount: body.claim_amount,
        urgency: body.urgency || 'medium',
        evidence_photo_urls: body.evidence_photo_urls,
        filed_by: user.id,
        status: 'submitted',
      })
      .select()
      .single();

    if (claimError) {
      console.error('[Warranty Claims API] Error creating claim:', error);
      throw new APIError('Failed to file claim', 500, 'DATABASE_ERROR');
    }

    // Update warranty status to 'claimed'
    await supabaseAdmin
      .from('warranties')
      .update({ status: 'claimed' })
      .eq('id', warrantyId);

    // TODO: Send notification to contractor

    return successResponse({ claim }, 201);
  } catch (error) {
    console.error('[Warranty Claims API] POST error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to file claim', 500, 'INTERNAL_ERROR');
  }
});

