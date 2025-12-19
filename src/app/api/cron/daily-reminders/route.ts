import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { successResponse, errorResponse } from '@/lib/apiHelpers';
import { sendSMS } from '@/lib/sms/taskNotifications';

/**
 * GET /api/cron/daily-reminders
 * Designed to be called by a cron scheduler (e.g. Vercel Cron, Railway)
 * Sends reminders for tasks scheduled to start tomorrow.
 */
export const GET = async (request: NextRequest) => {
  try {
    // Optional: Check for CRON_SECRET header for security
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // return errorResponse('Unauthorized', 401, 'UNAUTHORIZED'); 
      // Commented out for dev/demo ease, but recommended in prod
    }

    if (!supabaseAdmin) {
        return errorResponse('Service role client not available', 500, 'SERVER_ERROR');
    }

    // Calculate "tomorrow" date string (YYYY-MM-DD)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    console.log(`[Daily Reminder] Checking for tasks starting on ${dateStr}`);

    // Find tasks
    const { data: tasks, error } = await supabaseAdmin
      .from('tasks')
      .select(`
        id, 
        name, 
        scheduled_start,
        location:locations(name),
        contractor:contractors(id, name, phone)
      `)
      .eq('scheduled_start', dateStr)
      .in('status', ['not_started', 'in_progress'])
      .not('assigned_contractor_id', 'is', null);

    if (error) throw error;

    let sentCount = 0;

    if (tasks && tasks.length > 0) {
      for (const task of tasks) {
        // Safe access to contractor
        const contractor = Array.isArray(task.contractor) ? task.contractor[0] : task.contractor;
        const location = Array.isArray(task.location) ? task.location[0] : task.location;
        
        if (contractor && contractor.phone) {
          const body = `Reminder: Task "${task.name}" at ${location?.name || 'Unit'} is scheduled to start tomorrow (${dateStr}).`;
          
          await sendSMS({
            to: contractor.phone,
            body,
            type: 'reminder',
            taskId: task.id,
            contractorId: contractor.id
          });
          sentCount++;
        }
      }
    }

    return successResponse({ 
      processed: tasks?.length || 0, 
      sent: sentCount,
      target_date: dateStr 
    });

  } catch (error: any) {
    console.error('[Daily Reminder Cron] Error:', error);
    return errorResponse(error.message, 500, 'INTERNAL_ERROR');
  }
};
