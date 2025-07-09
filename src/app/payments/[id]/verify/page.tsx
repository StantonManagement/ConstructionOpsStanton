"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// Define types for fetched data
interface Project {
  id: number;
  name: string;
  [key: string]: any;
}
interface Contractor {
  id: number;
  name: string;
  trade?: string;
  [key: string]: any;
}
interface LineItem {
  id: number;
  line_item?: {
    description_of_work?: string;
    scheduled_value?: number;
    [key: string]: any;
  };
  previous_percent?: number;
  percent_gc?: number;
  submitted_percent?: number;
  this_period?: number;
  [key: string]: any;
}
interface PaymentApp {
  id: number;
  created_at?: string;
  status?: string;
  [key: string]: any;
}
interface Document {
  url?: string;
  [key: string]: any;
}

export default function PaymentVerificationPage() {
  const params = useParams();
  const router = useRouter();
  const paymentAppId = params?.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentApp, setPaymentApp] = useState<PaymentApp | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [document, setDocument] = useState<Document | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch payment application
        const { data: app, error: appError } = await supabase
          .from("payment_applications")
          .select("*, project:projects(*), contractor:contractors(*), line_item_progress:payment_line_item_progress(*, line_item:project_line_items(*))")
          .eq("id", paymentAppId)
          .single();
        if (appError) throw new Error(appError.message);
        setPaymentApp(app as PaymentApp);
        setProject(app.project as Project);
        setContractor(app.contractor as Contractor);
        setLineItems((app.line_item_progress || []) as LineItem[]);
        // 2. Fetch document
        const { data: docs, error: docError } = await supabase
          .from("payment_documents")
          .select("*")
          .eq("payment_app_id", paymentAppId);
        if (docError) throw new Error(docError.message);
        setDocument(docs && docs.length > 0 ? (docs[0] as Document) : null);
      } catch (err) {
        setError((err instanceof Error ? err.message : "Failed to load data"));
      } finally {
        setLoading(false);
      }
    }
    if (paymentAppId) fetchData();
  }, [paymentAppId]);

  const handleApprove = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("payment_applications")
        .update({ status: "approved" })
        .eq("id", paymentAppId);
      if (updateError) throw new Error(updateError.message);
      router.push("/dashboard");
    } catch (err) {
      setError((err instanceof Error ? err.message : "Failed to approve"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("payment_applications")
        .update({ status: "rejected" })
        .eq("id", paymentAppId);
      if (updateError) throw new Error(updateError.message);
      router.push("/dashboard");
    } catch (err) {
      setError((err instanceof Error ? err.message : "Failed to reject"));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⚙️</div>
          <p className="text-lg text-gray-600">Loading payment application...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-lg text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 text-gray-800"
      >
        <span className="text-lg">←</span> Back
      </button>
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-2 text-gray-900">Review Payment Application</h1>
        <div className="mb-4 text-gray-800">
          <div><b>Project:</b> {project?.name}</div>
          <div><b>Contractor:</b> {contractor?.name} ({contractor?.trade})</div>
          <div><b>Submitted:</b> {paymentApp?.created_at ? new Date(paymentApp.created_at).toLocaleDateString() : "-"}</div>
          <div><b>Status:</b> {paymentApp?.status}</div>
        </div>
        {document?.url && (
          <div className="mb-6">
            <h2 className="font-semibold mb-2">PDF Preview</h2>
            <iframe
              src={document.url}
              width="100%"
              height="500px"
              style={{ border: "1px solid #ccc", borderRadius: "8px" }}
              title="Payment Request PDF Preview"
            />
            <a
              href={document.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-blue-600 underline"
            >
              Open PDF in new tab
            </a>
          </div>
        )}
        <div className="mb-6">
          <h2 className="font-semibold mb-2 text-black">Line Items</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border text-sm text-black">
              <thead>
                <tr>
                  <th className="border px-2 py-1 text-black">#</th>
                  <th className="border px-2 py-1 text-black">Description of Work</th>
                  <th className="border px-2 py-1 text-black">Scheduled Value</th>
                  <th className="border px-2 py-1 text-black">Previous %</th>
                  <th className="border px-2 py-1 text-black">This Period %</th>
                  <th className="border px-2 py-1 text-black">Total %</th>
                  <th className="border px-2 py-1 text-black">Current Payment</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-black py-2">No line items found.</td>
                  </tr>
                ) : (
                  lineItems.map((lip, idx) => (
                    <tr key={lip.id || idx} className="text-black">
                      <td className="border px-2 py-1 text-black">{idx + 1}</td>
                      <td className="border px-2 py-1 text-black">{lip.line_item?.description_of_work || "-"}</td>
                      <td className="border px-2 py-1 text-black">{lip.line_item?.scheduled_value || "-"}</td>
                      <td className="border px-2 py-1 text-black">{lip.line_item?.from_previous_application || "-"}</td>
                      <td className="border px-2 py-1 text-black">{lip.line_item?.percent_gc || "-"}</td>
                      <td className="border px-2 py-1 text-black">{lip.line_item?.percent_completed || "-"}</td>
                      <td className="border px-2 py-1 text-black">{lip.line_item?.this_period || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleApprove}
            disabled={actionLoading}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {actionLoading ? "Processing..." : "Approve"}
          </button>
          <button
            onClick={handleReject}
            disabled={actionLoading}
            className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {actionLoading ? "Processing..." : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}