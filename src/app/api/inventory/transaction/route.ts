import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

interface TransactionLocation {
  type: 'truck' | 'project_site' | 'warehouse' | 'other';
  truck_id?: number;
  project_id?: number;
  location_name?: string;
}

/**
 * POST /api/inventory/transaction
 * Create a new inventory transaction (check-in, check-out, or transfer)
 *
 * Body:
 * {
 *   "item_id": 1,
 *   "transaction_type": "transfer",
 *   "quantity": 5,
 *   "from": { "type": "truck", "truck_id": 1 },
 *   "to": { "type": "project_site", "project_id": 2 },
 *   "assigned_to_user_id": 3,
 *   "notes": "Moving power tools to job site"
 * }
 */
export const POST = withAuth(async (request: NextRequest, user: unknown) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const body = await request.json();
    const {
      item_id,
      transaction_type,
      quantity,
      from,
      to,
      assigned_to_user_id,
      notes
    } = body;

    // Validate required fields
    if (!item_id || isNaN(parseInt(item_id))) {
      throw new APIError('Valid item_id is required', 400, 'VALIDATION_ERROR');
    }

    const validTypes = ['check_in', 'check_out', 'transfer', 'adjustment', 'initial_stock'];
    if (!transaction_type || !validTypes.includes(transaction_type)) {
      throw new APIError(
        `transaction_type must be one of: ${validTypes.join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }

    if (!quantity || isNaN(parseInt(quantity)) || quantity <= 0) {
      throw new APIError('Quantity must be a positive number', 400, 'VALIDATION_ERROR');
    }

    // Validate that item exists
    const { data: item, error: itemError } = await supabaseAdmin
      .from('inventory_items')
      .select('id, name')
      .eq('id', item_id)
      .single();

    if (itemError || !item) {
      throw new APIError('Item not found', 404, 'NOT_FOUND');
    }

    // Validate location configurations
    const fromLocation = from as TransactionLocation | undefined;
    const toLocation = to as TransactionLocation | undefined;

    // For transfers, both from and to are required
    if (transaction_type === 'transfer') {
      if (!fromLocation || !toLocation) {
        throw new APIError('Both from and to locations are required for transfers', 400, 'VALIDATION_ERROR');
      }
    }

    // For check-out, from location is required
    if (transaction_type === 'check_out') {
      if (!fromLocation) {
        throw new APIError('From location is required for check-out', 400, 'VALIDATION_ERROR');
      }
    }

    // For check-in or initial_stock, to location is required
    if (transaction_type === 'check_in' || transaction_type === 'initial_stock') {
      if (!toLocation) {
        throw new APIError('To location is required for check-in/initial stock', 400, 'VALIDATION_ERROR');
      }
    }

    // Helper function to validate location
    const validateLocation = async (loc: TransactionLocation | undefined, label: string) => {
      if (!loc) return null;

      const validLocationTypes = ['truck', 'project_site', 'warehouse', 'other'];
      if (!validLocationTypes.includes(loc.type)) {
        throw new APIError(
          `${label} location type must be one of: ${validLocationTypes.join(', ')}`,
          400,
          'VALIDATION_ERROR'
        );
      }

      // Validate truck exists if truck_id provided
      if (loc.truck_id) {
        const { data: truck } = await supabaseAdmin!
          .from('trucks')
          .select('id')
          .eq('id', loc.truck_id)
          .single();
        if (!truck) {
          throw new APIError(`${label} truck not found`, 404, 'NOT_FOUND');
        }
      }

      // Validate project exists if project_id provided
      if (loc.project_id) {
        const { data: project } = await supabaseAdmin!
          .from('projects')
          .select('id')
          .eq('id', loc.project_id)
          .single();
        if (!project) {
          throw new APIError(`${label} project not found`, 404, 'NOT_FOUND');
        }
      }

      return loc;
    };

    await validateLocation(fromLocation, 'From');
    await validateLocation(toLocation, 'To');

    // Check sufficient quantity at from location for check-out or transfer
    if (fromLocation && (transaction_type === 'check_out' || transaction_type === 'transfer')) {
      const { data: currentLocation } = await supabaseAdmin!
        .from('inventory_locations')
        .select('quantity')
        .eq('item_id', item_id)
        .eq('location_type', fromLocation.type)
        .eq('truck_id', fromLocation.truck_id || null)
        .eq('project_id', fromLocation.project_id || null)
        .eq('location_name', fromLocation.location_name || null)
        .maybeSingle();

      const availableQuantity = currentLocation?.quantity || 0;
      if (availableQuantity < quantity) {
        throw new APIError(
          `Insufficient quantity at source location. Available: ${availableQuantity}, Requested: ${quantity}`,
          400,
          'VALIDATION_ERROR'
        );
      }
    }

    // Create transaction record
    const authenticatedUser = user as { id: number };
    const transactionData = {
      item_id: parseInt(item_id),
      transaction_type,
      quantity: parseInt(quantity),
      from_location_type: fromLocation?.type || null,
      from_truck_id: fromLocation?.truck_id || null,
      from_project_id: fromLocation?.project_id || null,
      from_location_name: fromLocation?.location_name || null,
      to_location_type: toLocation?.type || null,
      to_truck_id: toLocation?.truck_id || null,
      to_project_id: toLocation?.project_id || null,
      to_location_name: toLocation?.location_name || null,
      performed_by_user_id: authenticatedUser.id,
      assigned_to_user_id: assigned_to_user_id || null,
      notes: notes?.trim() || null,
    };

    const { data: transaction, error: transactionError } = await supabaseAdmin!
      .from('inventory_transactions')
      .insert([transactionData])
      .select(`
        *,
        item:inventory_items(id, name, sku),
        from_truck:trucks(id, name, identifier),
        to_truck:trucks(id, name, identifier),
        from_project:projects(id, name),
        to_project:projects(id, name),
        performed_by:users(id, email, name),
        assigned_to:users(id, email, name)
      `)
      .single();

    if (transactionError) {
      console.error('[POST /api/inventory/transaction] Database error:', transactionError);
      throw new APIError('Failed to create transaction', 500, 'DATABASE_ERROR');
    }

    return successResponse(
      {
        message: `Transaction ${transaction_type} completed successfully`,
        transaction,
      },
      201
    );
  } catch (error) {
    console.error('[POST /api/inventory/transaction] Error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to create transaction',
      500,
      'INTERNAL_ERROR'
    );
  }
});

/**
 * GET /api/inventory/transaction
 * Get transaction history with optional filtering
 */
export const GET = withAuth(async (request: NextRequest, user: unknown) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('item_id');
    const truckId = searchParams.get('truck_id');
    const projectId = searchParams.get('project_id');
    const userId = searchParams.get('user_id');
    const transactionType = searchParams.get('transaction_type');
    const limit = parseInt(searchParams.get('limit') || '100');

    let query = supabaseAdmin
      .from('inventory_transactions')
      .select(`
        *,
        item:inventory_items(id, name, sku, category),
        from_truck:trucks(id, name, identifier),
        to_truck:trucks(id, name, identifier),
        from_project:projects(id, name),
        to_project:projects(id, name),
        performed_by:users(id, email, name),
        assigned_to:users(id, email, name)
      `)
      .order('transaction_date', { ascending: false })
      .limit(limit);

    if (itemId) query = query.eq('item_id', parseInt(itemId));
    if (transactionType) query = query.eq('transaction_type', transactionType);
    if (userId) {
      query = query.or(`performed_by_user_id.eq.${userId},assigned_to_user_id.eq.${userId}`);
    }
    if (truckId) {
      query = query.or(`from_truck_id.eq.${truckId},to_truck_id.eq.${truckId}`);
    }
    if (projectId) {
      query = query.or(`from_project_id.eq.${projectId},to_project_id.eq.${projectId}`);
    }

    const { data: transactions, error } = await query;

    if (error) {
      console.error('[GET /api/inventory/transaction] Database error:', error);
      throw new APIError('Failed to fetch transactions', 500, 'DATABASE_ERROR');
    }

    return successResponse({ transactions });
  } catch (error) {
    console.error('[GET /api/inventory/transaction] Error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch transactions',
      500,
      'INTERNAL_ERROR'
    );
  }
});
