import docusign from 'docusign-esign';
import { createClient } from '@supabase/supabase-js';

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

  // 2. Download PDF buffer (fetch from storage)
  const pdfRes = await fetch(doc.url);
  const pdfBuffer = await pdfRes.arrayBuffer();

  // 3. Set up DocuSign envelope
  const apiClient = new docusign.ApiClient();
  apiClient.setBasePath('https://demo.docusign.net/restapi');
  apiClient.addDefaultHeader('Authorization', 'Bearer ' + process.env.DOCUSIGN_ACCESS_TOKEN);

  const envelopeDefinition = {
    emailSubject: 'Please sign the payment application',
    documents: [
      {
        documentBase64: Buffer.from(pdfBuffer).toString('base64'),
        name: 'Payment Application.pdf',
        fileExtension: 'pdf',
        documentId: '1',
      },
    ],
    recipients: {
      signers: [
        {
          email: contractor.email,
          name: contractor.name,
          recipientId: '1',
          routingOrder: '1',
          tabs: {},
        },
      ],
    },
    status: 'sent',
  };

  // 4. Send envelope
  const envelopesApi = new docusign.EnvelopesApi(apiClient);
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  if (!accountId) {
    res.status(500).json({ error: 'DOCUSIGN_ACCOUNT_ID is not set in environment variables.' });
    return;
  }
  const results = await envelopesApi.createEnvelope(accountId, { envelopeDefinition });

  // 5. Save envelope ID to payment_documents
  await supabase.from('payment_documents').update({
    docusign_envelope_id: results.envelopeId,
    status: 'sent_for_signature',
  }).eq('id', doc.id);

  res.status(200).json({ envelopeId: results.envelopeId });
} 