import { supabaseAdmin } from '@/lib/supabaseClient';

interface SMSParams {
  to: string;
  body: string;
  type: 'task_assigned' | 'task_unblocked' | 'rework_needed' | 'reminder';
  taskId?: string;
  contractorId?: number; // Contractors use bigint ID
}

export async function sendSMS({ to, body, type, taskId, contractorId }: SMSParams) {
  if (supabaseAdmin && taskId) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: recent } = await supabaseAdmin
      .from('sms_log')
      .select('id')
      .eq('task_id', taskId)
      .eq('message_type', type)
      .gte('sent_at', oneHourAgo)
      .limit(1);

    if (recent && recent.length > 0) {
      return { success: true, sid: 'RATE_LIMITED' };
    }
  }

  // In a real implementation, we would use Twilio SDK here
  // const client = require('twilio')(accountSid, authToken);
  
  console.log(`[MOCK SMS] To: ${to} | Body: ${body}`);

  // Mock Success
  const success = true; 
  const mockSid = `SM${Math.random().toString(36).substring(7)}`;

  if (!supabaseAdmin) return { success, sid: mockSid };

  // Log to database
  await supabaseAdmin
    .from('sms_log')
    .insert([{
      task_id: taskId,
      contractor_id: contractorId,
      phone_number: to,
      message_type: type,
      message_body: body,
      twilio_sid: mockSid,
      status: success ? 'sent' : 'failed',
      sent_at: new Date().toISOString()
    }]);
    
  return { success, sid: mockSid };
}

export async function notifyTaskAssigned(taskId: string, contractorId: number) {
  if (!supabaseAdmin) return;

  // Fetch task and contractor details
  const { data: task } = await supabaseAdmin
    .from('tasks')
    .select('name, location:locations(name)')
    .eq('id', taskId)
    .single();

  const { data: contractor } = await supabaseAdmin
    .from('contractors')
    .select('phone, name')
    .eq('id', contractorId)
    .single();

  const location = Array.isArray(task?.location) ? task?.location[0] : task?.location;

  if (task && contractor?.phone) {
    const body = `New task assigned: ${task.name} at ${location?.name || 'Unit'}. Questions? Reply to this message.`;
    await sendSMS({
      to: contractor.phone,
      body,
      type: 'task_assigned',
      taskId,
      contractorId
    });
  }
}

export async function notifyTaskUnblocked(taskId: string) {
  if (!supabaseAdmin) return;

  // Fetch task and assigned contractor
  const { data: task } = await supabaseAdmin
    .from('tasks')
    .select(`
      name, 
      locations(name),
      assigned_contractor_id,
      contractors(phone, name)
    `)
    .eq('id', taskId)
    .single();

  // Need to handle type safety for joined contractor
  const contractor = Array.isArray((task as any)?.contractors) ? (task as any)?.contractors[0] : (task as any)?.contractors;
  const location = Array.isArray((task as any)?.locations) ? (task as any)?.locations[0] : (task as any)?.locations;

  if (task && contractor?.phone) {
    const body = `Task ready: ${task.name} at ${location?.name} is now unblocked and ready to start.`;
    await sendSMS({
      to: contractor.phone,
      body,
      type: 'task_unblocked',
      taskId,
      contractorId: (task as any).assigned_contractor_id
    });
  }
}

export async function notifyReworkNeeded(taskId: string, notes: string) {
  if (!supabaseAdmin) return;

  const { data: task } = await supabaseAdmin
    .from('tasks')
    .select(`
      name, 
      locations(name),
      assigned_contractor_id,
      contractors(phone, name)
    `)
    .eq('id', taskId)
    .single();

  const contractor = Array.isArray((task as any)?.contractors) ? (task as any)?.contractors[0] : (task as any)?.contractors;
  const location = Array.isArray((task as any)?.locations) ? (task as any)?.locations[0] : (task as any)?.locations;

  if (task && contractor?.phone) {
    const body = `Rework needed: ${task.name} at ${location?.name}. PM notes: ${notes}`;
    await sendSMS({
      to: contractor.phone,
      body,
      type: 'rework_needed',
      taskId,
      contractorId: (task as any).assigned_contractor_id
    });
  }
}
