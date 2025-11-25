import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { twilioClient, TWILIO_PHONE_NUMBER } from '@/lib/twilioClient';
import { sign } from 'jsonwebtoken';

// POST /api/punch-lists/assign - Assign punch list items and send SMS
export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const body = await req.json();
    const { itemIds, contractorId, projectId, userId } = body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'Item IDs are required' }, { status: 400 });
    }

    if (!contractorId || !projectId) {
      return NextResponse.json({ error: 'Contractor ID and Project ID are required' }, { status: 400 });
    }

    // Get contractor info
    const { data: contractor, error: contractorError } = await supabaseAdmin
      .from('contractors')
      .select('id, name, phone')
      .eq('id', contractorId)
      .single();

    if (contractorError || !contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Get project info
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Update punch list items with assigned status and contractor
    const { data: updatedItems, error: updateError } = await supabaseAdmin
      .from('punch_list_items')
      .update({
        contractor_id: contractorId,
        status: 'assigned',
        assigned_at: new Date().toISOString(),
        assigned_by: userId || null,
      })
      .in('id', itemIds)
      .select();

    if (updateError) {
      console.error('[Punch List Assign] Error updating items:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Generate contractor portal token
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const token = sign(
      {
        contractorId: contractor.id,
        projectId: project.id,
        type: 'punch_list_access',
      },
      jwtSecret,
      { expiresIn: '30d' } // Token valid for 30 days
    );

    // Store token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await supabaseAdmin
      .from('contractor_portal_tokens')
      .insert({
        contractor_id: contractor.id,
        token,
        expires_at: expiresAt.toISOString(),
      });

    // Generate portal link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const portalLink = `${baseUrl}/contractor-portal/${token}`;

    // Send SMS notification
    let smsResult: any = { status: 'not_sent', reason: 'missing_config' };
    
    if (contractor.phone && twilioClient && TWILIO_PHONE_NUMBER) {
      try {
        const message = `New punch list for ${project.name}. You have ${itemIds.length} item${itemIds.length > 1 ? 's' : ''} assigned. View details: ${portalLink}`;
        
        const result = await twilioClient.messages.create({
          body: message,
          from: TWILIO_PHONE_NUMBER,
          to: contractor.phone,
        });

        smsResult = { status: 'sent', sid: result.sid };
        console.log('[Punch List Assign] SMS sent successfully:', result.sid);
      } catch (smsError: any) {
        console.error('[Punch List Assign] SMS error:', smsError);
        smsResult = { 
          status: 'failed', 
          error: smsError.message || 'Unknown error' 
        };
      }
    } else {
      smsResult.reason = !contractor.phone 
        ? 'missing_phone' 
        : 'twilio_not_configured';
    }

    return NextResponse.json({
      success: true,
      data: {
        items: updatedItems,
        contractor,
        project,
        portalLink,
        sms: smsResult,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('[Punch List Assign] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

