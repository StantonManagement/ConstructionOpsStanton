import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseClient';
import MessagingResponse from 'twilio/lib/twiml/MessagingResponse';
import { normalizePhoneNumber } from '@/lib/phoneUtils';

// Force Node.js runtime for better logging
export const runtime = 'nodejs';

// Example questions (replace with dynamic logic as needed)
const QUESTIONS = [
  'What percent complete is your work for this period?',
  'Have you uploaded all required photos? (YES/NO)',
  'Is a lien waiver required? (YES/NO)',
  'Please write any notes for the Project Manager here'
];

// Helper function to generate summary
async function generateSummary(paymentAppId: number) {
  if (!supabase) {
    return 'Unable to generate summary at this time.';
  }

  const { data: progressRows } = await supabase
    .from('payment_line_item_progress')
    .select('line_item_id, this_period_percent')
    .eq('payment_app_id', paymentAppId);
    
  const { data: lineItemsData } = await supabase
    .from('project_line_items')
    .select('id, scheduled_value, description_of_work, from_previous_application')
    .in('id', (progressRows || []).map(r => r.line_item_id));
  
  let summary = 'Summary of your application: ';
  let totalThisPeriod = 0;
  let totalPreviousAmount = 0;
  
  (progressRows || []).forEach((row, index) => {
    const item = (lineItemsData || []).find(li => li.id === row.line_item_id);
    const totalPercent = Number(row.this_period_percent) || 0;
    const scheduled = Number(item?.scheduled_value) || 0;
    const previousPercent = Number(item?.from_previous_application) || 0;
    
    const totalAmount = scheduled * (totalPercent / 100);
    const previousAmount = scheduled * (previousPercent / 100);
    const thisPeriodAmount = totalAmount - previousAmount;
    
    totalThisPeriod += thisPeriodAmount;
    totalPreviousAmount += previousAmount;
    
    const desc = item?.description_of_work || 'Item';
    summary += `${desc} - (${totalPercent.toFixed(1)}%) = ${totalAmount.toFixed(0)} - ${previousPercent.toFixed(1)}% previous approved `;
  });
  
  const grandTotal = totalThisPeriod + totalPreviousAmount;
  summary += `Total Requested = ${grandTotal.toFixed(0)} - ${totalPreviousAmount.toFixed(0)} = ${totalThisPeriod.toFixed(0)} `;
  summary += 'Please type "Yes" to submit or "No" to redo your answers.';
  
  return summary;
}

export async function POST(req: NextRequest) {
  if (!supabase) {
    const twiml = new MessagingResponse();
    twiml.message('Service temporarily unavailable. Please try again later.');
    return new NextResponse(twiml.toString(), {
      status: 503,
      headers: { 'Content-Type': 'text/xml' }
    });
  }

  const formData = await req.formData();
  const from = formData.get('From');
  const body = (formData.get('Body') || '').toString().trim().toUpperCase();
  const numMedia = parseInt(formData.get('NumMedia')?.toString() || '0');

  // Extract media URLs if present
  const mediaUrls: Array<{url: string; contentType: string}> = [];
  for (let i = 0; i < numMedia; i++) {
    const mediaUrl = formData.get(`MediaUrl${i}`)?.toString();
    const contentType = formData.get(`MediaContentType${i}`)?.toString() || 'image/jpeg';
    if (mediaUrl) {
      mediaUrls.push({ url: mediaUrl, contentType });
    }
  }

  console.log('Incoming SMS:', { from, body, numMedia, mediaCount: mediaUrls.length });
  console.error('DEBUG: SMS webhook called at', new Date().toISOString());

  if (!from) {
    console.error('No From in SMS');
    return NextResponse.json({ error: 'Missing From' }, { status: 400 });
  }

  // Normalize the incoming phone number to E.164 format for consistent matching
  const normalizedFrom = normalizePhoneNumber(from.toString());
  if (!normalizedFrom) {
    console.error('Invalid phone number format:', from);
    const twiml = new MessagingResponse();
    twiml.message('Invalid phone number format.');
    return new NextResponse(twiml.toString(), {
      status: 400,
      headers: { 'Content-Type': 'text/xml' }
    });
  }

  console.error(`[WEBHOOK DEBUG] Phone normalized: ${from} → ${normalizedFrom}`);

  const twiml = new MessagingResponse();

  // PRIORITY 1: Check for daily log request FIRST (newer feature, takes precedence)
  // This prevents old payment conversations from hijacking daily log replies
  console.error(`[DAILY LOG CHECK] Phone: ${normalizedFrom}`);
  console.error(`[DAILY LOG CHECK] Timestamp: ${new Date().toISOString()}`);

  // First try to find a 'sent' request (actively waiting for reply)
  let { data: dailyLogRequest, error: dailyLogError } = await supabase
      .from('daily_log_requests')
      .select('id, project_id, request_status, projects(id, name)')
      .eq('pm_phone_number', normalizedFrom)
      .eq('request_status', 'sent')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

  console.error(`[DAILY LOG CHECK] 'sent' status query result:`, dailyLogRequest);
  console.error(`[DAILY LOG CHECK] 'sent' status query error:`, dailyLogError);

  // If no 'sent' request found, check for 'received' requests from today
  // This allows PMs to send multiple updates throughout the day
  if (!dailyLogRequest) {
    const today = new Date().toISOString().slice(0, 10);
    console.error(`[DAILY LOG CHECK] No 'sent' request found, checking for 'received' requests from today (${today})`);

    const { data: receivedRequest, error: receivedError } = await supabase
      .from('daily_log_requests')
      .select('id, project_id, request_status, projects(id, name)')
      .eq('pm_phone_number', normalizedFrom)
      .eq('request_status', 'received')
      .eq('request_date', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    console.error(`[DAILY LOG CHECK] 'received' status query result:`, receivedRequest);
    console.error(`[DAILY LOG CHECK] 'received' status query error:`, receivedError);

    dailyLogRequest = receivedRequest;
  }

  console.error(`[DAILY LOG CHECK] Final result - Found: ${dailyLogRequest ? 'YES (ID: ' + dailyLogRequest.id + ', status: ' + dailyLogRequest.request_status + ')' : 'NO'}`);
  if (dailyLogError) {
    console.error(`[DAILY LOG CHECK] Error: ${dailyLogError.message}`);
  }

    if (dailyLogRequest) {
      const today = new Date().toISOString().slice(0, 10);
      const projectId = dailyLogRequest.project_id;

      // Track if this is an update to an existing received log
      const isUpdate = dailyLogRequest.request_status === 'received';

      // Get a system user or first admin user for created_by
      // Use supabase.auth.admin to query auth.users
      const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });

      if (usersError || !users || users.length === 0) {
        console.error('Error fetching admin user for daily log:', usersError);
        twiml.message('Error saving daily log. Please contact support.');
        return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
      }

      const createdBy = users[0].id;

      // Find or create daily log for today
      let { data: existingLog } = await supabase
        .from('daily_logs')
        .select('id')
        .eq('project_id', projectId)
        .eq('log_date', today)
        .single();

      let logId: number;

      if (!existingLog) {
        // Create new daily log
        const { data: newLog, error: createError } = await supabase
          .from('daily_logs')
          .insert({
            project_id: projectId,
            created_by: createdBy,
            log_date: today,
            notes: body,
            status: 'submitted',
          })
          .select('id')
          .single();

        if (createError || !newLog) {
          console.error('Error creating daily log:', createError);
          twiml.message('Error saving daily log. Please try again.');
          return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
        }
        logId = newLog.id;
      } else {
        // Update existing log
        logId = existingLog.id;
        await supabase
          .from('daily_logs')
          .update({
            notes: body,
            status: 'submitted',
            updated_at: new Date().toISOString(),
          })
          .eq('id', logId);
      }

      // Handle photo attachments
      if (mediaUrls.length > 0) {
        console.log(`Processing ${mediaUrls.length} photos for daily log ${logId}`);

        for (let i = 0; i < mediaUrls.length; i++) {
          try {
            const media = mediaUrls[i];

            // Download photo from Twilio
            const response = await fetch(media.url);
            if (!response.ok) {
              console.error(`Failed to download photo ${i + 1}:`, response.statusText);
              continue;
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Determine file extension
            const fileExt = media.contentType.includes('png') ? 'png' : 'jpg';
            const timestamp = Date.now();
            const fileName = `${timestamp}-${i}.${fileExt}`;
            const filePath = `${projectId}/${today}/${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
              .from('daily-log-photos')
              .upload(filePath, buffer, {
                contentType: media.contentType,
                upsert: false
              });

            if (uploadError) {
              console.error(`Error uploading photo ${i + 1}:`, uploadError);
              continue;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('daily-log-photos')
              .getPublicUrl(filePath);

            // Save photo record
            const { error: dbError } = await supabase
              .from('daily_log_photos')
              .insert({
                daily_log_id: logId,
                photo_url: publicUrl,
                supabase_storage_path: filePath,
                caption: null,
                sort_order: i,
                taken_at: new Date().toISOString()
              });

            if (dbError) {
              console.error(`Error saving photo ${i + 1} to database:`, dbError);
              // Try to clean up uploaded file
              await supabase.storage.from('daily-log-photos').remove([filePath]);
            } else {
              console.log(`Successfully saved photo ${i + 1} for daily log ${logId}`);
            }
          } catch (photoError) {
            console.error(`Error processing photo ${i + 1}:`, photoError);
          }
        }
      }

      // Update daily log request status
      await supabase
        .from('daily_log_requests')
        .update({
          request_status: 'received',
          received_notes: body,
          received_at: new Date().toISOString()
        })
        .eq('id', dailyLogRequest.id);

      const photoMessage = mediaUrls.length > 0
        ? ` with ${mediaUrls.length} photo${mediaUrls.length > 1 ? 's' : ''}`
        : '';
      const projectName = (dailyLogRequest.projects as any)?.name || 'your project';
      const updateMessage = isUpdate ? 'updated' : 'received';
      twiml.message(`Thank you! Your daily log${photoMessage} has been ${updateMessage} for ${projectName}.`);
      return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
    }

  // PRIORITY 2: No daily log - check for active payment conversation
  console.log('No daily log request found, checking for payment conversation');
  const { data: conv, error } = await supabase
    .from('payment_sms_conversations')
    .select('*')
    .eq('contractor_phone', normalizedFrom)
    .in('conversation_state', ['awaiting_start', 'in_progress', 'awaiting_confirmation'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  console.log('Found payment conversation:', conv, 'Error:', error);

  if (error || !conv) {
    // PRIORITY 3: Neither daily log nor payment conversation found
    console.error(`No active daily log or payment conversation found for ${normalizedFrom} (original: ${from})`);
    twiml.message('No active conversation found. Please contact your project manager.');
    return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
  }

  // Ensure responses is an array and idx is a number
  let responses: string[] = Array.isArray(conv.responses) ? conv.responses : [];
  let idx: number = typeof conv.current_question_index === 'number' ? conv.current_question_index : 0;
  const lineItems = Array.isArray(conv.line_items) ? conv.line_items : [];
  const numLineItems = lineItems.length;

  const ADDITIONAL_QUESTIONS = [
    'Please write any notes for the Project Manager here'
  ];

  if (conv.conversation_state === 'awaiting_start') {
    if (body === 'YES') {
      await supabase
        .from('payment_sms_conversations')
        .update({ conversation_state: 'in_progress', current_question_index: 0 })
        .eq('id', conv.id);
      
      if (numLineItems > 0) {
        const firstLineItemId = lineItems[0].id;
        
        // Get previous percentage from project_line_items (source of truth)
        const { data: lineItemData } = await supabase
          .from('project_line_items')
          .select('from_previous_application')
          .eq('id', firstLineItemId)
          .single();
        
        const prevPercent = Number(lineItemData?.from_previous_application) || 0;
        
        twiml.message(`What percent complete is your work for: ${lineItems[0].description_of_work}? (Previous: ${prevPercent}%)`);
      } else {
        twiml.message(ADDITIONAL_QUESTIONS[0]);
      }
    } else {
      twiml.message('Reply YES when you are ready to begin your payment application.');
    }
  } else if (conv.conversation_state === 'in_progress') {
    responses[idx] = body;

    if (idx < numLineItems) {
      // Handle line item percent validation and updates
      const lineItemId = lineItems[idx].id;
      const percent = parseFloat(body);
      
      if (isNaN(percent) || percent < 0 || percent > 100) {
        console.warn('[Percent Validation] Invalid percent reply:', { input: body, parsed: percent, idx, lineItemId });
        twiml.message('Please reply with a valid percent (0-100).');
        return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
      }

      // Get previous percentage from project_line_items (source of truth)
      const { data: lineItemData, error: prevError } = await supabase
        .from('project_line_items')
        .select('from_previous_application')
        .eq('id', lineItemId)
        .single();
      
      if (prevError) {
        console.error('[Percent Validation] Database error fetching line item:', prevError);
        twiml.message('System error occurred. Please try again later.');
        return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
      }
      
      const prevPercent = Number(lineItemData?.from_previous_application) || 0;
      const currentPercent = Number(percent);
      
      console.error(`[Percent Validation] Line Item ${lineItemId}: Previous=${prevPercent}%, Current=${currentPercent}%, PaymentApp=${conv.payment_app_id}`);
      
      if (currentPercent < prevPercent) {
        console.warn(`[Percent Validation] BLOCKED: ${currentPercent}% < ${prevPercent}% for line item ${lineItemId}`);
        twiml.message(`Error: ${currentPercent}% is less than your previous submission of ${prevPercent}%. Please enter ${prevPercent}% or higher.`);
        return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
      }

      console.log(`[Percent Validation] PASSED: ${currentPercent}% >= ${prevPercent}% for line item ${lineItemId}`);

      // Calculate amounts
      const { data: currentPLI } = await supabase
        .from('project_line_items')
        .select('scheduled_value')
        .eq('id', lineItemId)
        .single();
      
      const scheduledValueFloat = Number(currentPLI?.scheduled_value) || 0;
      const previousPercentFloat = Number(prevPercent);
      const thisPeriodPercent = Math.max(0, currentPercent - previousPercentFloat);
      const amountForThisPeriod = parseFloat((scheduledValueFloat * (thisPeriodPercent / 100)).toFixed(2));
      
      // Only update payment_line_item_progress during SMS submission
      // project_line_items will be updated after PM approval
      await supabase
        .from('payment_line_item_progress')
        .update({
          previous_percent: prevPercent,
          this_period_percent: percent,
          submitted_percent: percent,
          pm_verified_percent: percent,  // Initialize with submitted value (PM can edit later)
          calculated_amount: amountForThisPeriod
        })
        .eq('payment_app_id', conv.payment_app_id)
        .eq('line_item_id', lineItemId);

      idx++;
      
      // Update conversation and determine next action
      let nextQuestion = '';
      let shouldShowSummary = false;

      if (idx < numLineItems) {
        // Get next line item question with previous percentage
        const nextLineItemId = lineItems[idx].id;
        
        // Get previous percentage from project_line_items (source of truth)
        const { data: lineItemData } = await supabase
          .from('project_line_items')
          .select('from_previous_application')
          .eq('id', nextLineItemId)
          .single();
        
        const prevPercent = Number(lineItemData?.from_previous_application) || 0;
        
        nextQuestion = `What percent complete is your work for: ${lineItems[idx].description_of_work}? (Previous: ${prevPercent}%)`;
      } else if (idx - numLineItems < ADDITIONAL_QUESTIONS.length) {
        nextQuestion = ADDITIONAL_QUESTIONS[idx - numLineItems];
      } else {
        shouldShowSummary = true;
      }

      // Update conversation state
      const updateObj: any = { 
        responses,
        current_question_index: idx
      };

      if (shouldShowSummary) {
        updateObj.conversation_state = 'awaiting_confirmation';
      }

      await supabase
        .from('payment_sms_conversations')
        .update(updateObj)
        .eq('id', conv.id);

      if (shouldShowSummary) {
        const summary = await generateSummary(conv.payment_app_id);
        twiml.message(summary);
      } else {
        twiml.message(nextQuestion);
      }

    } else if (idx - numLineItems < ADDITIONAL_QUESTIONS.length) {
      // Handle additional questions (PM notes, etc.)
      console.log('Processing additional question. idx:', idx, 'numLineItems:', numLineItems, 'body:', body);
      
      responses[idx] = body;
      idx++;

      // Save PM notes immediately when provided
      if (idx - numLineItems === 1) { // Just finished the PM notes question
        console.log('Saving PM notes for payment_app_id:', conv.payment_app_id, 'Notes:', body);
        await supabase
          .from('payment_applications')
          .update({ pm_notes: body })
          .eq('id', conv.payment_app_id);
      }

      const updateObj: any = { 
        responses,
        current_question_index: idx
      };

      if (idx - numLineItems >= ADDITIONAL_QUESTIONS.length) {
        // All questions answered - move to confirmation
        updateObj.conversation_state = 'awaiting_confirmation';
        
        await supabase
          .from('payment_sms_conversations')
          .update(updateObj)
          .eq('id', conv.id);
        
        const summary = await generateSummary(conv.payment_app_id);
        twiml.message(summary);
      } else {
        // Ask next additional question
        await supabase
          .from('payment_sms_conversations')
          .update(updateObj)
          .eq('id', conv.id);
        
        const nextQuestion = ADDITIONAL_QUESTIONS[idx - numLineItems];
        twiml.message(nextQuestion);
      }
    }
  } else if (conv.conversation_state === 'awaiting_confirmation') {
    if (body === 'YES') {
      // Final submission
      const updatePromises = [
        supabase
          .from('payment_sms_conversations')
          .update({
            conversation_state: 'completed',
            completed_at: new Date().toISOString(),
            responses
          })
          .eq('id', conv.id),
        
        supabase
          .from('payment_applications')
          .update({ status: 'submitted' })
          .eq('id', conv.payment_app_id)
      ];

      // Calculate totals for final update
      const { data: progressRows } = await supabase
        .from('payment_line_item_progress')
        .select('this_period_percent, line_item_id')
        .eq('payment_app_id', conv.payment_app_id);
        
      const { data: lineItemsData } = await supabase
        .from('project_line_items')
        .select('id, scheduled_value, from_previous_application')
        .in('id', (progressRows || []).map(r => r.line_item_id));
        
      const totalCurrentPayment = (progressRows || []).reduce((sum, row) => {
        const item = (lineItemsData || []).find(li => li.id === row.line_item_id);
        const totalPercent = Number(row.this_period_percent) || 0;
        const scheduled = Number(item?.scheduled_value) || 0;
        const previousPercent = Number(item?.from_previous_application) || 0;
        const thisPeriodPercent = Math.max(0, totalPercent - previousPercent);
        return sum + (scheduled * (thisPeriodPercent / 100));
      }, 0);

      updatePromises.push(
        supabase
          .from('payment_applications')
          .update({ 
            current_payment: totalCurrentPayment,
            current_period_value: totalCurrentPayment
          })
          .eq('id', conv.payment_app_id)
      );

      // Execute all updates
      await Promise.all(updatePromises);

      twiml.message('Thank you! Your payment application is submitted for Project Manager review.');
      
    } else if (body === 'NO') {
      // Restart - reset everything
      const resetPromises = [
        supabase
          .from('payment_sms_conversations')
          .update({
            conversation_state: 'in_progress',
            current_question_index: 0,
            responses: []
          })
          .eq('id', conv.id),
        
        supabase
          .from('payment_line_item_progress')
          .update({
            submitted_percent: 0,
            this_period_percent: 0,
            calculated_amount: 0,
            updated_at: new Date().toISOString()
          })
          .eq('payment_app_id', conv.payment_app_id)
      ];

      await Promise.all(resetPromises);
      
      if (numLineItems > 0) {
        const firstLineItemId = lineItems[0].id;
        
        // Get previous percentage from project_line_items (source of truth)
        const { data: lineItemData } = await supabase
          .from('project_line_items')
          .select('from_previous_application')
          .eq('id', firstLineItemId)
          .single();
        
        const prevPercent = Number(lineItemData?.from_previous_application) || 0;
        const desc = lineItems[0].description_of_work || '';
        twiml.message(`What percent complete is your work for: ${desc}? (Previous: ${prevPercent}%)`);
      } else {
        twiml.message(ADDITIONAL_QUESTIONS[0]);
      }
    } else {
      twiml.message('Please type "Yes" to submit or "No" to redo your answers.');
    }
  } else {
    twiml.message('This payment application conversation is already complete.');
  }

  return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
}