import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { twilioClient, TWILIO_PHONE_NUMBER } from '@/lib/twilioClient';

/**
 * Automated Bid Reminder Cron Job (SMS Only)
 *
 * This endpoint should be called by a cron service (e.g., Vercel Cron, cron-job.org)
 * to automatically send SMS reminders to contractors about upcoming bid deadlines.
 *
 * Schedule recommendations:
 * - Run daily at 9 AM: Send reminders for deadlines 2 days away
 * - Run daily at 9 AM: Send reminders for deadlines 1 day away
 *
 * Authentication:
 * - Protected by CRON_SECRET environment variable
 * - Call with: Authorization: Bearer CRON_SECRET
 *
 * Example cron schedule:
 * - "0 9 * * *" - Every day at 9 AM
 */

const REMINDER_DAYS_BEFORE = [2, 1]; // Send reminders 2 days and 1 day before deadline

export async function POST(req: NextRequest) {
  try {
    console.log('[BID REMINDERS] Cron job started');

    // Verify cron secret for security
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || process.env.SECRET_KEY;

    if (!cronSecret) {
      console.error('[BID REMINDERS] CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      );
    }

    const providedSecret = authHeader?.replace('Bearer ', '');
    if (providedSecret !== cronSecret) {
      console.error('[BID REMINDERS] Invalid cron secret');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if Twilio is configured
    if (!twilioClient || !TWILIO_PHONE_NUMBER) {
      console.error('[BID REMINDERS] Twilio not configured');
      return NextResponse.json(
        { error: 'SMS service not configured' },
        { status: 503 }
      );
    }

    // Use Supabase admin client (bypasses RLS, no user session required)
    if (!supabaseAdmin) {
      console.error('[BID REMINDERS] Supabase admin client not available');
      return NextResponse.json(
        { error: 'Database client not configured' },
        { status: 500 }
      );
    }

    // Get today's date (UTC midnight) and calculate reminder dates
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const reminderDates = REMINDER_DAYS_BEFORE.map(days => {
      const date = new Date(todayUTC);
      date.setUTCDate(date.getUTCDate() + days);
      return date;
    });

    console.log('[BID REMINDERS] Checking for deadlines on:', reminderDates.map(d => d.toISOString()));

    // Find active bid rounds with deadlines matching our reminder dates
    const { data: bidRounds, error: bidRoundsError} = await supabaseAdmin
      .from('bid_rounds')
      .select(`
        id,
        name,
        trade,
        deadline_date,
        project:projects(id, name)
      `)
      .eq('status', 'active')
      .not('deadline_date', 'is', null);

    if (bidRoundsError) {
      console.error('[BID REMINDERS] Error fetching bid rounds:', bidRoundsError);
      throw bidRoundsError;
    }

    if (!bidRounds || bidRounds.length === 0) {
      console.log('[BID REMINDERS] No active bid rounds found');
      return NextResponse.json({
        success: true,
        message: 'No active bid rounds to process',
        sent: 0,
      });
    }

    // Filter bid rounds that need reminders
    const bidRoundsNeedingReminders = bidRounds.filter(br => {
      if (!br.deadline_date) return false;

      // Parse deadline and normalize to UTC midnight
      const deadline = new Date(br.deadline_date);
      const deadlineUTC = new Date(Date.UTC(deadline.getUTCFullYear(), deadline.getUTCMonth(), deadline.getUTCDate()));

      return reminderDates.some(reminderDate =>
        deadlineUTC.getTime() === reminderDate.getTime()
      );
    });

    console.log(`[BID REMINDERS] Found ${bidRoundsNeedingReminders.length} bid rounds needing reminders`);

    let totalSent = 0;
    let totalFailed = 0;
    const results: Array<{
      bidRoundId: number;
      bidRoundName: string;
      sent: number;
      failed: number;
    }> = [];

    // Process each bid round
    for (const bidRound of bidRoundsNeedingReminders) {
      try {
        // Get all bids for this round
        const { data: bids, error: bidsError } = await supabaseAdmin
          .from('bids')
          .select(`
            id,
            status,
            contractor_id,
            contractor:contractors(id, name, phone)
          `)
          .eq('bid_round_id', bidRound.id);

        if (bidsError) {
          console.error(`[BID REMINDERS] Error fetching bids for round ${bidRound.id}:`, bidsError);
          continue;
        }

        // Filter contractors who haven't submitted (status = draft) and have phone numbers
        const pendingBids = (bids || []).filter(b =>
          b.status === 'draft' &&
          b.contractor &&
          b.contractor.phone
        );

        if (pendingBids.length === 0) {
          console.log(`[BID REMINDERS] No pending bids with phone numbers for round ${bidRound.id}`);
          continue;
        }

        console.log(`[BID REMINDERS] Sending ${pendingBids.length} SMS reminders for round ${bidRound.id}`);

        let roundSent = 0;
        let roundFailed = 0;

        // Calculate days until deadline
        const deadline = new Date(bidRound.deadline_date!);
        const daysUntil = Math.ceil((deadline.getTime() - todayUTC.getTime()) / (1000 * 60 * 60 * 24));

        // Get the base URL for the status callback (skip localhost)
        const protocol = req.headers.get('x-forwarded-proto') || 'http';
        const host = req.headers.get('host');
        const isLocalhost = host?.includes('localhost') || host?.includes('127.0.0.1');
        const statusCallbackUrl = !isLocalhost ? `${protocol}://${host}/api/webhooks/twilio/sms-status` : undefined;

        // Send SMS reminder to each contractor
        for (const bid of pendingBids) {
          const contractor = bid.contractor;

          if (!contractor || !contractor.phone) {
            roundFailed++;
            continue;
          }

          try {
            const deadlineText = deadline.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            });

            // Prepare SMS reminder message with reply instructions
            const message = `REMINDER: ${contractor.name}, you have ${daysUntil} day${daysUntil > 1 ? 's' : ''} left to submit your bid for "${bidRound.name}" (${bidRound.project?.name || 'project'}). Deadline: ${deadlineText}. Reply with your bid amount (e.g., "$25000").`;

            // Send SMS via Twilio
            const smsResult = await twilioClient.messages.create({
              body: message,
              from: TWILIO_PHONE_NUMBER,
              to: contractor.phone,
              ...(statusCallbackUrl && { statusCallback: statusCallbackUrl }),
            });

            console.log(`[BID REMINDERS] SMS sent to ${contractor.name}:`, smsResult.sid);

            // Log SMS notification in database
            const { error: logError } = await supabaseAdmin.from('bid_notifications').insert({
              bid_round_id: bidRound.id,
              contractor_id: contractor.id,
              notification_type: 'sms',
              phone_number: contractor.phone,
              message_content: message,
              status: 'sent',
              twilio_sid: smsResult.sid,
              sent_at: new Date().toISOString(),
            });

            if (logError) {
              console.warn('[BID REMINDERS] Could not log SMS notification:', logError.message);
            }

            roundSent++;

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[BID REMINDERS] Error sending SMS to ${contractor.name}:`, errorMessage);
            roundFailed++;
          }
        }

        results.push({
          bidRoundId: bidRound.id,
          bidRoundName: bidRound.name,
          sent: roundSent,
          failed: roundFailed,
        });

        totalSent += roundSent;
        totalFailed += roundFailed;

      } catch (error) {
        console.error(`[BID REMINDERS] Error processing bid round ${bidRound.id}:`, error);
      }
    }

    console.log(`[BID REMINDERS] Cron job completed. Sent: ${totalSent}, Failed: ${totalFailed}`);

    return NextResponse.json({
      success: true,
      message: `Sent ${totalSent} SMS reminder(s)`,
      data: {
        sent: totalSent,
        failed: totalFailed,
        bidRounds: results,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[BID REMINDERS] Error:', errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// GET endpoint for testing/verification
export async function GET() {
  return NextResponse.json({
    service: 'Bid Reminders Cron Job (SMS Only)',
    status: 'active',
    endpoint: '/api/cron/send-bid-reminders',
    authentication: 'Requires CRON_SECRET in Authorization header',
    schedule: 'Should be run daily',
    reminderDays: REMINDER_DAYS_BEFORE,
    note: 'Only sends SMS reminders to contractors with phone numbers',
  });
}
