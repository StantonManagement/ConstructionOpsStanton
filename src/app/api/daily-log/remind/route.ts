import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseClient';
import twilio from 'twilio';

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

export async function POST(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  // 1. Get all active projects and their managers
  const { data: projects } = await supabase.from('properties').select('property_id, property_name, manager_id, manager_phone');
  if (!projects) return NextResponse.json({ error: 'No projects found' }, { status: 404 });

  // 2. For each project, check if a log exists for today
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  for (const project of projects) {
    if (!project.manager_phone) continue;
    const { data: log } = await supabase
      .from('project_daily_logs')
      .select('id, status')
      .eq('project_id', project.property_id)
      .eq('log_date', today)
      .single();

    if (!log || log.status !== 'submitted') {
      // 3. Send SMS reminder
      await twilioClient.messages.create({
        body: `Please reply with your daily log notes for project "${project.property_name}".`,
        from: TWILIO_PHONE_NUMBER,
        to: project.manager_phone,
      });
    }
  }
  return NextResponse.json({ status: 'Reminders sent' });
} 