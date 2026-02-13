import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { twilioClient, TWILIO_PHONE_NUMBER } from '@/lib/twilioClient';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  req: NextRequest,
  context: RouteContext
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database client not available' },
        { status: 500 }
      );
    }
    const params = await context.params;
    const bidRoundId = params.id;

    // Check if Twilio is configured
    if (!twilioClient || !TWILIO_PHONE_NUMBER) {
      return NextResponse.json(
        { error: 'SMS service not configured' },
        { status: 503 }
      );
    }

    // Get contractor IDs from request body
    const { contractorIds, customMessage } = await req.json();

    if (!contractorIds || !Array.isArray(contractorIds) || contractorIds.length === 0) {
      return NextResponse.json(
        { error: 'Contractor IDs are required' },
        { status: 400 }
      );
    }

    // Fetch bid round details
    const { data: bidRound, error: bidRoundError } = await supabaseAdmin
      .from('bid_rounds')
      .select(`
        *,
        project:projects(id, name, address)
      `)
      .eq('id', bidRoundId)
      .single();

    if (bidRoundError || !bidRound) {
      console.error('[BID ROUND SMS] Error fetching bid round:', bidRoundError);
      return NextResponse.json(
        { error: 'Bid round not found' },
        { status: 404 }
      );
    }

    // Fetch contractors
    const { data: contractors, error: contractorsError } = await supabaseAdmin
      .from('contractors')
      .select('id, name, phone, email')
      .in('id', contractorIds);

    if (contractorsError || !contractors || contractors.length === 0) {
      console.error('[BID ROUND SMS] Error fetching contractors:', contractorsError);
      return NextResponse.json(
        { error: 'No contractors found' },
        { status: 404 }
      );
    }

    // Prepare results
    const results = {
      success: [] as Array<{ contractorId: number; contractorName: string; phone: string }>,
      failed: [] as Array<{ contractorId: number; contractorName: string; phone: string; error: string }>,
    };

    // Format deadline
    const deadlineText = bidRound.deadline_date
      ? `Deadline: ${new Date(bidRound.deadline_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}`
      : 'No deadline';

    // Send SMS to each contractor
    for (const contractor of contractors) {
      try {
        // Validate phone number
        if (!contractor.phone) {
          results.failed.push({
            contractorId: contractor.id,
            contractorName: contractor.name,
            phone: 'N/A',
            error: 'No phone number on file',
          });
          continue;
        }

        // Generate message with reply instructions
        const message = customMessage ||
          `Hi ${contractor.name}, you're invited to bid on "${bidRound.name}" for ${bidRound.project?.name || 'project'}. ${deadlineText}. Trade: ${bidRound.trade}. TO SUBMIT: Reply with your bid amount (e.g., "$25000" or "25000"). We'll confirm receipt.`;

        // Get the base URL for the status callback (skip localhost)
        const protocol = req.headers.get('x-forwarded-proto') || 'http';
        const host = req.headers.get('host');
        const isLocalhost = host?.includes('localhost') || host?.includes('127.0.0.1');
        const statusCallbackUrl = !isLocalhost ? `${protocol}://${host}/api/webhooks/twilio/sms-status` : undefined;

        // Send SMS via Twilio
        const result = await twilioClient.messages.create({
          body: message,
          from: TWILIO_PHONE_NUMBER,
          to: contractor.phone,
          ...(statusCallbackUrl && { statusCallback: statusCallbackUrl }),
        });

        console.log(`[BID ROUND SMS] Sent to ${contractor.name} (${contractor.phone}):`, result.sid);

        results.success.push({
          contractorId: contractor.id,
          contractorName: contractor.name,
          phone: contractor.phone,
        });

        // Log SMS notification in database
        const { error: logError } = await supabaseAdmin.from('bid_notifications').insert({
          bid_round_id: parseInt(bidRoundId),
          contractor_id: contractor.id,
          notification_type: 'sms',
          sent_at: new Date().toISOString(),
          phone_number: contractor.phone,
          message_content: message,
          status: 'sent',
          twilio_sid: result.sid,
        });

        if (logError) {
          console.warn('[BID ROUND SMS] Could not log notification:', logError.message);
        }

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[BID ROUND SMS] Failed to send to ${contractor.name}:`, errorMessage);

        results.failed.push({
          contractorId: contractor.id,
          contractorName: contractor.name,
          phone: contractor.phone || 'N/A',
          error: errorMessage,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${results.success.length} SMS invitation(s)`,
      data: {
        sent: results.success.length,
        failed: results.failed.length,
        results,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[BID ROUND SMS] Error:', errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
