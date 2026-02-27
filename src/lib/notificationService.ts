/**
 * Notification Service
 *
 * Centralized service for sending notifications (SMS/Email)
 * Supports templated messages for different event types
 */

import { twilioClient, TWILIO_PHONE_NUMBER } from './twilioClient';

export interface NotificationOptions {
  to: string; // Phone number or email
  type: 'sms' | 'email';
  template: NotificationTemplate;
  variables: Record<string, any>;
}

export type NotificationTemplate =
  | 'punch_list_assigned'
  | 'punch_list_completed'
  | 'punch_list_rejected'
  | 'punch_list_verified'
  | 'punch_list_comment'
  | 'payment_approved'
  | 'payment_rejected'
  | 'payment_verified'
  | 'change_order_submitted'
  | 'change_order_approved'
  | 'change_order_rejected'
  | 'daily_log_reminder'
  | 'warranty_expiring'
  | 'bid_reminder'
  | 'pm_note';

/**
 * SMS Templates for different notification types
 */
const SMS_TEMPLATES: Record<NotificationTemplate, (vars: Record<string, any>) => string> = {
  punch_list_assigned: (vars) =>
    `🔨 Punch List Item Assigned\n\nProject: ${vars.projectName}\nItem: ${vars.itemDescription}\nDue: ${vars.dueDate}\n\nPlease complete and update status.`,

  punch_list_completed: (vars) =>
    `✅ Punch List Item Completed\n\nProject: ${vars.projectName}\nItem: ${vars.itemDescription}\nContractor: ${vars.contractorName}\n\nPlease verify completion.`,

  punch_list_rejected: (vars) =>
    `❌ Punch List Item Rejected\n\nProject: ${vars.projectName}\nItem: ${vars.itemDescription}\nReason: ${vars.reason}\n\nPlease review and resubmit.`,

  punch_list_verified: (vars) =>
    `✓ Punch List Item Verified\n\nProject: ${vars.projectName}\nItem: ${vars.itemDescription}\n\nWork has been verified and accepted.`,

  punch_list_comment: (vars) =>
    `💬 New Comment on Punch List Item\n\nProject: ${vars.projectName}\nItem: ${vars.itemDescription}\nFrom: ${vars.commenterName}\n\n"${vars.comment}"`,

  payment_approved: (vars) =>
    `💰 Payment Application Approved\n\nProject: ${vars.projectName}\nAmount: ${vars.amount}\nApplication #${vars.applicationNumber}\n\nFunds will be processed shortly.`,

  payment_rejected: (vars) =>
    `⚠️ Payment Application Rejected\n\nProject: ${vars.projectName}\nAmount: ${vars.amount}\nApplication #${vars.applicationNumber}\nReason: ${vars.reason}\n\nPlease review and resubmit.`,

  payment_verified: (vars) =>
    `✓ Payment Application Verified\n\nProject: ${vars.projectName}\nAmount: ${vars.amount}\nApplication #${vars.applicationNumber}\n\nReady for approval.`,

  change_order_submitted: (vars) =>
    `📝 Change Order Submitted\n\nProject: ${vars.projectName}\nCO #${vars.changeOrderNumber}\nAmount: ${vars.amount}\n\nAwaiting your approval.`,

  change_order_approved: (vars) =>
    `✅ Change Order Approved\n\nProject: ${vars.projectName}\nCO #${vars.changeOrderNumber}\nAmount: ${vars.amount}\n\nYou may proceed with the work.`,

  change_order_rejected: (vars) =>
    `❌ Change Order Rejected\n\nProject: ${vars.projectName}\nCO #${vars.changeOrderNumber}\nReason: ${vars.reason}\n\nPlease review and discuss.`,

  daily_log_reminder: (vars) =>
    `📋 Daily Log Reminder\n\nProject: ${vars.projectName}\nLocation: ${vars.locationName}\n\nPlease submit today's daily log by end of day.`,

  warranty_expiring: (vars) =>
    `⏰ Warranty Expiring Soon\n\nProject: ${vars.projectName}\nItem: ${vars.itemName}\nExpires: ${vars.expirationDate}\n\nPlease schedule inspection if needed.`,

  bid_reminder: (vars) =>
    `📊 Bid Reminder\n\nProject: ${vars.projectName}\nScope: ${vars.scopeName}\nDue: ${vars.dueDate}\n\nPlease submit your bid before the deadline.`,

  pm_note: (vars) =>
    `📌 PM Note\n\nProject: ${vars.projectName}\nFrom: ${vars.pmName}\n\n${vars.note}`,
};

/**
 * Send SMS notification using Twilio
 */
export async function sendSMSNotification(
  to: string,
  template: NotificationTemplate,
  variables: Record<string, any>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!twilioClient || !TWILIO_PHONE_NUMBER) {
      console.error('[Notification] Twilio client not configured');
      return { success: false, error: 'SMS service not configured' };
    }

    // Clean phone number (remove non-digits except +)
    const cleanPhone = to.replace(/[^\d+]/g, '');

    // Validate phone number format
    if (!cleanPhone.startsWith('+')) {
      console.error('[Notification] Invalid phone number format:', to);
      return { success: false, error: 'Invalid phone number format' };
    }

    // Generate message from template
    const messageTemplate = SMS_TEMPLATES[template];
    if (!messageTemplate) {
      console.error('[Notification] Unknown template:', template);
      return { success: false, error: 'Unknown notification template' };
    }

    const message = messageTemplate(variables);

    // Send SMS via Twilio
    const result = await twilioClient.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: cleanPhone,
    });

    console.log('[Notification] SMS sent successfully:', {
      to: cleanPhone,
      template,
      messageId: result.sid,
    });

    return {
      success: true,
      messageId: result.sid,
    };
  } catch (error) {
    console.error('[Notification] Failed to send SMS:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send Email notification (placeholder for future implementation)
 */
export async function sendEmailNotification(
  to: string,
  template: NotificationTemplate,
  variables: Record<string, any>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  console.log('[Notification] Email notifications not yet implemented:', {
    to,
    template,
    variables,
  });

  // TODO: Implement email sending (SendGrid, AWS SES, etc.)
  return {
    success: false,
    error: 'Email notifications not yet implemented',
  };
}

/**
 * Generic notification sender that handles both SMS and Email
 */
export async function sendNotification(
  options: NotificationOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (options.type === 'sms') {
    return sendSMSNotification(options.to, options.template, options.variables);
  } else if (options.type === 'email') {
    return sendEmailNotification(options.to, options.template, options.variables);
  } else {
    return {
      success: false,
      error: `Unknown notification type: ${options.type}`,
    };
  }
}

/**
 * Log notification to database (optional)
 */
export async function logNotification(
  supabaseClient: any,
  notification: {
    recipient_id?: string;
    recipient_phone?: string;
    recipient_email?: string;
    notification_type: NotificationTemplate;
    message: string;
    status: 'sent' | 'failed';
    error_message?: string;
    metadata?: Record<string, any>;
  }
) {
  try {
    const { error } = await supabaseClient
      .from('notification_logs')
      .insert({
        ...notification,
        sent_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[Notification] Failed to log notification:', error);
    }
  } catch (error) {
    console.error('[Notification] Exception logging notification:', error);
    // Don't throw - logging failure shouldn't break the notification
  }
}
