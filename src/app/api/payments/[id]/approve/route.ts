import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateG703Pdf } from '@/lib/g703Pdf';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Helper function to save PDF file
async function savePdfFile(pdfBytes: Uint8Array, filename: string): Promise<string> {
  try {
    // Create invoices directory if it doesn't exist
    const invoicesDir = join(process.cwd(), 'public', 'invoices');
    mkdirSync(invoicesDir, { recursive: true });
    
    // Save file to public/invoices
    const filepath = join(invoicesDir, filename);
    writeFileSync(filepath, pdfBytes);
    
    return `/invoices/${filename}`;
  } catch (error) {
    console.error('Error saving PDF file:', error);
    throw error;
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const paymentAppId = id;
    const { approvalNotes } = await req.json();

    if (!paymentAppId) {
      return NextResponse.json({ error: 'Payment application ID is required' }, { status: 400 });
    }

    // Get current user for approval tracking
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user details
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('uuid', user.id)
      .single();

    if (userDataError) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update payment application status to approved
    const { data: updatedApp, error: updateError } = await supabase
      .from('payment_applications')
      .update({
        status: 'approved',
        approved_by: userData.id,
        approved_at: new Date().toISOString(),
        approval_notes: approvalNotes || null
      })
      .eq('id', paymentAppId)
      .select('*, project:projects(name, budget, spent), contractor:contractors(name, email)')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Update project budget - add current payment to spent amount
    if (updatedApp.current_payment) {
      const currentSpent = updatedApp.project.spent || 0;
      const newSpentAmount = currentSpent + updatedApp.current_payment;
      
      const { error: budgetUpdateError } = await supabase
        .from('projects')
        .update({
          spent: newSpentAmount
        })
        .eq('id', updatedApp.project_id);

      if (budgetUpdateError) {
        console.error('Error updating project budget:', budgetUpdateError);
        // Don't fail the approval if budget update fails, but log it
      } else {
        console.log(`Updated project ${updatedApp.project_id} spent amount: ${currentSpent} + ${updatedApp.current_payment} = ${newSpentAmount}`);
      }
    }

    // Log the approval action (if table exists)
    try {
      await supabase
        .from('payment_approval_logs')
        .insert({
          payment_app_id: paymentAppId,
          action: 'approved',
          performed_by: userData.id,
          notes: approvalNotes || null,
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.log('Note: payment_approval_logs table not found, skipping log entry');
    }

    console.log(`Payment application ${paymentAppId} approved by ${userData.name}`);

    // Generate invoice (G703 PDF) after approval
    try {
      // Fetch additional data needed for invoice generation
      const { data: lineItems } = await supabase
        .from('project_line_items')
        .select('*')
        .eq('project_id', updatedApp.project.id)
        .eq('contractor_id', updatedApp.contractor_id);

      // Prepare invoice data
      const invoiceData = {
        project: {
          name: updatedApp.project.name,
          address: updatedApp.project.address || 'Project Address'
        },
        contractor: {
          name: updatedApp.contractor.name
        },
        applicationNumber: updatedApp.id,
        invoiceDate: new Date().toLocaleDateString(),
        period: updatedApp.payment_period_end || new Date().toLocaleDateString(),
        dateSubmitted: updatedApp.created_at ? new Date(updatedApp.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
        previousDate: 'N/A',
        lineItems: lineItems?.map(item => ({
          item_no: item.item_no,
          description_of_work: item.description_of_work,
          scheduled_value: item.scheduled_value,
          previous: item.previous_completed || 0,
          this_period: item.percent_completed || 0,
          material_presently_stored: item.material_stored || 0,
          total_completed: (item.percent_completed || 0) * (item.scheduled_value || 0) / 100,
          balance_to_finish: (item.scheduled_value || 0) - ((item.percent_completed || 0) * (item.scheduled_value || 0) / 100),
          retainage: 0
        })) || []
      };

      const { pdfBytes, filename } = await generateG703Pdf(invoiceData);

      // Save the PDF file to public/invoices directory
      const filePath = await savePdfFile(pdfBytes, filename);
      console.log(`Invoice generated and saved: ${filename} at ${filePath} for payment application ${paymentAppId}`);

      // Save invoice record to database
      try {
        await supabase
          .from('invoices')
          .insert({
            payment_app_id: paymentAppId,
            filename: filename,
            file_path: filePath,
            generated_at: new Date().toISOString(),
            generated_by: userData.id,
            file_size: pdfBytes.length,
            status: 'generated'
          });
        console.log(`Invoice record saved to database for payment application ${paymentAppId}`);
      } catch (invoiceDbError) {
        console.log('Note: Could not save invoice record to database:', invoiceDbError);
      }

    } catch (invoiceError) {
      console.error('Error generating invoice:', invoiceError);
      // Don't fail the approval if invoice generation fails
    }

    return NextResponse.json({
      message: 'Payment application approved successfully and invoice generated',
      paymentApp: updatedApp
    });

  } catch (error) {
    console.error('Error approving payment application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}