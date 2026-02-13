import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { twilioClient, TWILIO_PHONE_NUMBER } from '@/lib/twilioClient';

/**
 * Twilio Incoming SMS Webhook
 *
 * Receives incoming SMS messages from contractors replying with their bid amounts.
 * Automatically creates bid records and sends confirmation messages.
 *
 * Twilio sends POST requests with these parameters:
 * - From: Contractor's phone number
 * - Body: SMS message body (bid amount)
 * - MessageSid: Unique message identifier
 */

/**
 * Parse bid amount from SMS message text
 * Handles formats like: "$25000", "25000", "$25,000", "25k", etc.
 */
function parseBidAmount(text: string): number | null {
  // Remove all non-numeric characters except decimal point
  const cleaned = text.replace(/[$,\s]/g, '');

  // Handle "k" suffix (thousands)
  if (cleaned.toLowerCase().endsWith('k')) {
    const num = parseFloat(cleaned.slice(0, -1));
    return isNaN(num) ? null : num * 1000;
  }

  // Parse as regular number
  const num = parseFloat(cleaned);
  return isNaN(num) || num <= 0 ? null : num;
}

export async function POST(req: NextRequest) {
  try {
    console.log('[INCOMING SMS] Received webhook from Twilio');

    if (!supabaseAdmin) {
      console.error('[INCOMING SMS] Supabase admin client not available');
      return NextResponse.json(
        { error: 'Database client not available' },
        { status: 500 }
      );
    }

    // Parse form data from Twilio
    const formData = await req.formData();
    const from = formData.get('From') as string; // Contractor's phone
    const body = formData.get('Body') as string; // Message text
    const messageSid = formData.get('MessageSid') as string;

    console.log(`[INCOMING SMS] From: ${from}, Body: "${body}"`);

    if (!from || !body) {
      console.error('[INCOMING SMS] Missing required parameters');
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Parse bid amount from message
    const bidAmount = parseBidAmount(body);

    if (!bidAmount) {
      console.log(`[INCOMING SMS] Could not parse bid amount from: "${body}"`);

      // Send help message
      if (twilioClient && TWILIO_PHONE_NUMBER) {
        await twilioClient.messages.create({
          body: `Sorry, we couldn't understand "${body}". Please reply with just your bid amount, like "$25000" or "25000".`,
          from: TWILIO_PHONE_NUMBER,
          to: from,
        });
      }

      return NextResponse.json({
        message: 'Invalid bid amount format',
        receivedText: body,
      });
    }

    console.log(`[INCOMING SMS] Parsed bid amount: $${bidAmount}`);

    // Find the most recent bid invitation sent to this phone number
    // Look for notifications in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentNotifications, error: notificationError } = await supabaseAdmin
      .from('bid_notifications')
      .select(`
        id,
        bid_round_id,
        contractor_id,
        contractor:contractors(id, name),
        bid_round:bid_rounds(id, name, status, deadline_date, project:projects(name))
      `)
      .eq('phone_number', from)
      .eq('notification_type', 'sms')
      .gte('sent_at', thirtyDaysAgo.toISOString())
      .order('sent_at', { ascending: false })
      .limit(1);

    if (notificationError) {
      console.error('[INCOMING SMS] Error finding notification:', notificationError);
      throw notificationError;
    }

    if (!recentNotifications || recentNotifications.length === 0) {
      console.log(`[INCOMING SMS] No recent invitations found for ${from}`);

      // Send error message
      if (twilioClient && TWILIO_PHONE_NUMBER) {
        await twilioClient.messages.create({
          body: `We couldn't find an active bid invitation for this number. Please contact us for assistance.`,
          from: TWILIO_PHONE_NUMBER,
          to: from,
        });
      }

      return NextResponse.json({
        message: 'No active bid invitation found',
        phone: from,
      });
    }

    const notification = recentNotifications[0];
    const bidRound = notification.bid_round as any;
    const contractor = notification.contractor as any;

    console.log(`[INCOMING SMS] Matched to bid round: ${bidRound?.name} (ID: ${notification.bid_round_id})`);
    console.log(`[INCOMING SMS] Contractor: ${contractor?.name} (ID: ${notification.contractor_id})`);

    // Check if bid round is still active
    if (bidRound?.status !== 'active') {
      console.log(`[INCOMING SMS] Bid round is no longer active (status: ${bidRound?.status})`);

      if (twilioClient && TWILIO_PHONE_NUMBER) {
        await twilioClient.messages.create({
          body: `Sorry, the bid round for "${bidRound?.name}" is no longer accepting bids. Please contact us for more information.`,
          from: TWILIO_PHONE_NUMBER,
          to: from,
        });
      }

      return NextResponse.json({
        message: 'Bid round is no longer active',
        bidRoundStatus: bidRound?.status,
      });
    }

    // Check if deadline has passed
    if (bidRound?.deadline_date) {
      const deadline = new Date(bidRound.deadline_date);
      if (deadline < new Date()) {
        console.log(`[INCOMING SMS] Deadline has passed for bid round ${notification.bid_round_id}`);

        if (twilioClient && TWILIO_PHONE_NUMBER) {
          await twilioClient.messages.create({
            body: `Sorry, the deadline for "${bidRound.name}" has passed. Please contact us if you have questions.`,
            from: TWILIO_PHONE_NUMBER,
            to: from,
          });
        }

        return NextResponse.json({
          message: 'Bid deadline has passed',
          deadline: bidRound.deadline_date,
        });
      }
    }

    // Check if bid already exists
    const { data: existingBids } = await supabaseAdmin
      .from('bids')
      .select('id, status, amount')
      .eq('bid_round_id', notification.bid_round_id)
      .eq('contractor_id', notification.contractor_id)
      .limit(1);

    if (existingBids && existingBids.length > 0) {
      const existingBid = existingBids[0];

      // Update existing bid instead of creating new one
      const { error: updateError } = await supabaseAdmin
        .from('bids')
        .update({
          amount: bidAmount,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          notes: `Bid submitted via SMS reply. Previous amount: $${existingBid.amount || 0}`,
          source_type: 'sms_reply',
        })
        .eq('id', existingBid.id);

      if (updateError) {
        console.error('[INCOMING SMS] Error updating bid:', updateError);
        throw updateError;
      }

      console.log(`[INCOMING SMS] Updated existing bid ${existingBid.id} with amount: $${bidAmount}`);

      // Send confirmation
      if (twilioClient && TWILIO_PHONE_NUMBER) {
        const projectName = bidRound.project?.name || 'project';
        await twilioClient.messages.create({
          body: `Thank you ${contractor.name}! Your updated bid of $${bidAmount.toLocaleString()} for "${bidRound.name}" (${projectName}) has been received and submitted.`,
          from: TWILIO_PHONE_NUMBER,
          to: from,
        });
      }

      return NextResponse.json({
        success: true,
        action: 'updated',
        bidId: existingBid.id,
        amount: bidAmount,
        contractor: contractor.name,
        bidRound: bidRound.name,
      });
    }

    // Create new bid
    const { data: newBid, error: bidError } = await supabaseAdmin
      .from('bids')
      .insert({
        bid_round_id: notification.bid_round_id,
        contractor_id: notification.contractor_id,
        amount: bidAmount,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        notes: 'Bid submitted via SMS reply',
        source_type: 'sms_reply',
      })
      .select()
      .single();

    if (bidError) {
      console.error('[INCOMING SMS] Error creating bid:', bidError);
      throw bidError;
    }

    console.log(`[INCOMING SMS] Created new bid ${newBid.id} with amount: $${bidAmount}`);

    // Send confirmation SMS
    if (twilioClient && TWILIO_PHONE_NUMBER) {
      const projectName = bidRound.project?.name || 'project';
      await twilioClient.messages.create({
        body: `Thank you ${contractor.name}! Your bid of $${bidAmount.toLocaleString()} for "${bidRound.name}" (${projectName}) has been received and submitted successfully.`,
        from: TWILIO_PHONE_NUMBER,
        to: from,
      });
    }

    return NextResponse.json({
      success: true,
      action: 'created',
      bidId: newBid.id,
      amount: bidAmount,
      contractor: contractor.name,
      bidRound: bidRound.name,
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[INCOMING SMS] Error:', errorMessage);

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// GET endpoint for testing/verification
export async function GET() {
  return NextResponse.json({
    service: 'Twilio Incoming SMS Webhook',
    status: 'active',
    endpoint: '/api/webhooks/twilio/sms-incoming',
    description: 'Receives SMS replies from contractors with bid amounts and automatically creates bid records',
  });
}
