// PDFfiller is now used for e-signature integration. This file is deprecated.
// Lien waiver e-signatures with DocuSign
// Future Phase: Implement DocuSign integration

export function createEnvelope(templateId: string, signerEmail: string) {
  throw new Error("DocuSign integration is scheduled for a future phase.");
}

export function sendForSignature(envelopeId: string) {
  throw new Error("DocuSign integration is scheduled for a future phase.");
}

export function handleWebhook(req: any) {
  throw new Error("DocuSign integration is scheduled for a future phase.");
}
