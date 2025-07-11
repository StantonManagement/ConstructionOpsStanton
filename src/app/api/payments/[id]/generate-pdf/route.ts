import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Mustache from 'mustache';
import puppeteer from 'puppeteer';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// @ts-ignore
export async function POST(req: NextRequest, { params }) {
  const paymentAppId = parseInt(params.id, 10);

  // 1. Fetch all required data
  const { data: paymentApp } = await supabase.from('payment_applications').select('*').eq('id', paymentAppId).single();
  const { data: project } = await supabase.from('projects').select('*').eq('id', paymentApp.project_id).single();
  const { data: contractor } = await supabase.from('contractors').select('*').eq('id', paymentApp.contractor_id).single();
  const { data: lineItemProgress } = await supabase
    .from('payment_line_item_progress')
    .select('*, line_item:project_line_items(*)')
    .eq('payment_app_id', paymentAppId);

  // 2. Fetch the template (replace with your actual template or fetch from DB)
  const template = `<!DOCTYPE html><html><head><title>AIA G702 - Application for Payment</title><style>body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; } .header { text-align: center; margin-bottom: 30px; } .project-info { display: flex; justify-content: space-between; margin-bottom: 20px; } table { width: 100%; border-collapse: collapse; margin-bottom: 20px; } th, td { border: 1px solid #000; padding: 8px; text-align: left; } th { background-color: #f0f0f0; font-weight: bold; } .number { text-align: right; } .totals { background-color: #f9f9f9; font-weight: bold; } .signature { margin-top: 40px; }</style></head><body><div class="header"><h2>APPLICATION AND CERTIFICATE FOR PAYMENT</h2><p>AIA Document G702</p></div><div class="project-info"><div><strong>Project:</strong> {{project.name}}<br><strong>Location:</strong> {{project.address}}<br><strong>Contract For:</strong> {{contractor.name}}</div><div><strong>Application No.:</strong> {{applicationNumber}}<br><strong>Application Date:</strong> {{applicationDate}}<br><strong>Period to:</strong> {{periodTo}}</div></div><table><thead><tr><th>Item</th><th>Description of Work</th><th>Scheduled Value</th><th>Previous %</th><th>This Period %</th><th>Total %</th><th>Current Payment</th></tr></thead><tbody>{{lineItems}}</tbody><tfoot><tr class="totals"><td colspan="6"><strong>TOTAL CURRENT PAYMENT</strong></td><td class="number"><strong>{{totalCurrentPayment}}</strong></td></tr></tfoot></table><div class="signature"><p><strong>Contractor's Certification:</strong></p><p>The undersigned Contractor certifies that to the best of the Contractor's knowledge,  information and belief the Work covered by this Application for Payment has been completed...</p><div style="margin-top: 60px;"><div style="display: inline-block; width: 45%;"><div style="border-bottom: 1px solid #000; margin-bottom: 5px; height: 20px;"></div><p>Contractor Signature</p></div><div style="display: inline-block; width: 45%; margin-left: 10%;"><div style="border-bottom: 1px solid #000; margin-bottom: 5px; height: 20px;"></div><p>Date</p></div></div></div></body></html>`;

  // 3. Render HTML
  const safeLineItemProgress = Array.isArray(lineItemProgress) ? lineItemProgress : [];
  // Fetch project_line_items for all line items in this payment application
  const lineItemIds = safeLineItemProgress.map(lip => lip.line_item_id);
  const { data: projectLineItems } = await supabase
    .from('project_line_items')
    .select('*')
    .in('id', lineItemIds);

  // Map project_line_items by id for easy lookup
  const pliMap: Record<number, any> = {};
  (projectLineItems || []).forEach((pli: any) => { pliMap[pli.id] = pli; });

  // Build line items for the PDF
  const lineItemsForPDF = safeLineItemProgress.map((lip, idx) => {
    const pli = pliMap[lip.line_item_id] || {};
    return {
      idx: idx + 1,
      description_of_work: pli.description_of_work || lip.line_item?.description_of_work || '',
      scheduled_value: Number(pli.scheduled_value) || 0,
      previous: Number(pli.from_previous_application) || 0,
      this_period: Number(pli.this_period) || 0,
      total: Number(pli.percent_completed) || 0,
      current_payment: Number(pli.amount_for_this_period) || 0,
    };
  });
  const grandTotal = lineItemsForPDF.reduce((sum, li) => sum + li.current_payment, 0);

  const html = Mustache.render(template, {
    project,
    contractor,
    applicationNumber: paymentApp.id,
    applicationDate: paymentApp.created_at,
    periodTo: paymentApp.payment_period_end,
    lineItems: lineItemsForPDF.map(li => `
      <tr>
        <td>${li.idx}</td>
        <td>${li.description_of_work}</td>
        <td class="number">${li.scheduled_value}</td>
        <td class="number">${li.previous}</td>
        <td class="number">${li.this_period}</td>
        <td class="number">${li.total}</td>
        <td class="number">${li.current_payment}</td>
      </tr>
    `).join('') + `
      <tr class="totals">
        <td colspan="6"><strong>GRAND TOTAL</strong></td>
        <td class="number"><strong>${grandTotal}</strong></td>
      </tr>
    `,
    totalCurrentPayment: grandTotal,
  });

  // 4. Generate PDF
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({ format: 'A4' });
  await browser.close();

  // 5. Upload PDF to Supabase Storage
  const filePath = `payment_app_${paymentAppId}_${Date.now()}.pdf`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('payment-documents')
    .upload(filePath, pdfBuffer, { contentType: 'application/pdf' });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // 6. Save PDF URL in payment_documents table
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/payment-documents/${filePath}`;
  await supabase.from('payment_documents').insert({
    payment_app_id: paymentAppId,
    url,
    status: 'pending_review',
  });

  return NextResponse.json({ url });
} 