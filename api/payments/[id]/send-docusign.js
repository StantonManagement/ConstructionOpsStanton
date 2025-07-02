import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const paymentAppId = parseInt(req.query.id, 10);
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // 1. Fetch PDF URL and recipient info
  const { data: doc } = await supabase.from('payment_documents').select('*').eq('payment_app_id', paymentAppId).single();
  const { data: paymentApp } = await supabase.from('payment_applications').select('*').eq('id', paymentAppId).single();
  const { data: contractor } = await supabase.from('contractors').select('*').eq('id', paymentApp.contractor_id).single();

  // 2. Download PDF buffer
  const pdfRes = await fetch(doc.url);
  const pdfBuffer = await pdfRes.buffer();

  // 3. Upload PDF to PDFfiller
  const uploadRes = await fetch('https://api.pdffiller.com/v2.0/filled-forms', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PDFFILLER_ACCESS_TOKEN}`,
      'Content-Type': 'application/pdf',
    },
    body: pdfBuffer,
  });
  const uploadData = await uploadRes.json();

  if (!uploadRes.ok) {
    res.status(500).json({ error: 'Failed to upload PDF to PDFfiller', details: uploadData });
    return;
  }

  // 4. Send signature request (example, see PDFfiller API docs for exact endpoint and payload)
  // This is a placeholder; you may need to adjust the endpoint and payload
  const signatureRes = await fetch(`https://api.pdffiller.com/v2.0/signature-requests`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PDFFILLER_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      document_id: uploadData.id, // or uploadData.document_id, depending on API response
      signers: [
        {
          email: contractor.email,
          name: contractor.name,
          // You may need to specify fields or roles depending on your PDFfiller template
        }
      ],
      // Add any other required fields per PDFfiller API
    }),
  });
  const signatureData = await signatureRes.json();

  if (!signatureRes.ok) {
    res.status(500).json({ error: 'Failed to send signature request via PDFfiller', details: signatureData });
    return;
  }

  res.status(200).json({ message: 'PDF sent for signature via PDFfiller', signatureData });
} 