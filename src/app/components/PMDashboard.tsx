"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import Header from "./Header";

// Utility functions
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Stat Card Component
function StatCard({ icon, label, value, subtitle, color }: any) {
  const colorClasses: Record<string, string> = {
    orange: "border-orange-200 bg-orange-50",
    blue: "border-blue-200 bg-blue-50",
    green: "border-green-200 bg-green-50",
    purple: "border-purple-200 bg-purple-50",
  };
  return (
    <div className={`border-2 rounded-lg p-4 ${colorClasses[color]} transition-shadow hover:shadow-md`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="font-semibold text-gray-900">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-800">{subtitle}</div>
    </div>
  );
}

function OverviewStats({ pendingSMS, reviewQueue, readyChecks, weeklyTotal }: any) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <StatCard icon="🔄" label="Pending SMS" value={pendingSMS} subtitle="Waiting for responses" color="orange" />
      <StatCard icon="📋" label="Review Queue" value={reviewQueue} subtitle="Need PM verification" color="blue" />
      <StatCard icon="✅" label="Ready Checks" value={readyChecks} subtitle="Approved for pickup" color="green" />
      <StatCard icon="💰" label="This Week" value={formatCurrency(weeklyTotal)} subtitle="Total payments" color="purple" />
    </div>
  );
}

function PaymentAppCard({ application, onVerify, getDocumentForApp, sendForSignature }: any) {
  const statusConfig: any = {
    sms_complete: {
      icon: "📱",
      label: "SMS Complete",
      color: "bg-green-100 text-green-800",
      action: "Verify & Approve",
      urgent: true,
    },
    needs_review: {
      icon: "📋",
      label: "PM Review",
      color: "bg-blue-100 text-blue-800",
      action: "Review Now",
      urgent: true,
    },
    check_ready: {
      icon: "✅",
      label: "Check Ready",
      color: "bg-gray-100 text-gray-800",
      action: "View Details",
      urgent: false,
    },
    submitted: {
      icon: "📋",
      label: "PM Review",
      color: "bg-blue-100 text-blue-800",
      action: "Review Now",
      urgent: true,
    },
    approved: {
      icon: "✅",
      label: "Check Ready",
      color: "bg-gray-100 text-gray-800",
      action: "View Details",
      urgent: false,
    },
  };
  const config = statusConfig[application.status] || statusConfig["needs_review"];
  const doc = getDocumentForApp(application.id);

  const [grandTotal, setGrandTotal] = useState(0);
  useEffect(() => {
    async function fetchGrandTotal() {
      const lineItemIds = (application.line_item_progress || []).map((lip: any) => lip.line_item?.id).filter(Boolean);
      if (!lineItemIds.length) return setGrandTotal(0);
      const { data, error } = await supabase
        .from('project_line_items')
        .select('amount_for_this_period')
        .in('id', lineItemIds);
      if (!error && data) {
        const total = data.reduce((sum: number, pli: any) => sum + (Number(pli.amount_for_this_period) || 0), 0);
        setGrandTotal(total);
      }
    }
    fetchGrandTotal();
  }, [application.line_item_progress]);

  return (
    <div
      className={`border rounded-lg p-4 transition-all hover:shadow-md ${config.urgent ? "border-blue-300 bg-blue-25" : "border-gray-200"}`}
    >
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
            <h3 className="font-semibold text-lg">
              {application.project?.name} - {application.contractor?.name}
            </h3>
            <span className={`px-2 py-1 rounded text-sm font-medium self-start ${config.color}`}>
              {config.icon} {config.label}
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm mb-3">
            <div>
              <span className="text-gray-800 block">Amount:</span>
              <div className="font-semibold text-lg">{formatCurrency(grandTotal)}</div>
            </div>
            <div>
              <span className="text-gray-800 block">Trade:</span>
              <div className="font-semibold">{application.contractor?.trade}</div>
            </div>
            <div>
              <span className="text-gray-800 block">Submitted:</span>
              <div className="font-semibold">{application.created_at ? formatDate(application.created_at) : "-"}</div>
            </div>
            <div>
              <span className="text-gray-800 block">Line Items:</span>
              <div className="font-semibold">{(application.line_item_progress || []).filter((lip: any) => lip.line_item).length} items</div>
            </div>
          </div>
          {application.status === "sms_complete" && (
            <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded text-gray-800">
              📱 Contractor completed SMS responses - ready for site verification
            </div>
          )}
        </div>
        <div className="md:ml-4">
          <button
            onClick={() => onVerify(application.id)}
            className={`w-full md:w-auto px-4 py-2 rounded font-medium transition-colors ${
              config.urgent ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-600 text-white hover:bg-gray-700"
            }`}
          >
            {config.action}
          </button>
        </div>
      </div>
      {doc && (
        <div className="flex flex-col gap-2 mt-2">
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-200 px-3 py-1 rounded text-sm"
          >
            Review PDF
          </a>
          <iframe
            src={doc.url}
            width="100%"
            height="400px"
            style={{ border: "1px solid #ccc", borderRadius: "8px" }}
            title="Payment Request PDF Preview"
          />
          <button
            onClick={() => sendForSignature(application.id)}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
          >
            Send for Signature
          </button>
        </div>
      )}
    </div>
  );
}

function PaymentApplicationsQueue({ applications, onVerify, getDocumentForApp, sendForSignature }: any) {
  // Sort by priority: needs_review > sms_complete > check_ready
  const sortedApps = [...applications].sort((a, b) => {
    const priority: any = { needs_review: 3, sms_complete: 2, check_ready: 1, submitted: 3, approved: 1 };
    return (priority[b.status] || 0) - (priority[a.status] || 0);
  });
  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900">
        💰 Payment Applications Queue
        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-normal">
          {applications.length} active
        </span>
      </h2>
      <div className="space-y-3 text-gray-800">
        {sortedApps.map((app) => (
          <PaymentAppCard key={app.id} application={app} onVerify={onVerify} getDocumentForApp={getDocumentForApp} sendForSignature={sendForSignature} />
        ))}
        {applications.length === 0 && (
          <div className="text-center py-8 text-gray-800 border border-gray-200 rounded-lg">
            <p className="text-lg mb-2">📭 No active payment applications</p>
            <p className="text-sm">Create payment apps from projects below</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project, onCreatePaymentApps }: any) {
  const [loading, setLoading] = useState(false);
  const percent = project.budget > 0 ? Math.min(100, Math.round((project.spent / project.budget) * 100)) : 0;
  const handleCreatePaymentApps = async () => {
    setLoading(true);
    try {
      await onCreatePaymentApps(project.id);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to create payment apps:", error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
      <div className="mb-3">
        <h3 className="font-semibold text-lg text-gray-900">{project.name}</h3>
        <p className="text-sm text-gray-800">{project.client_name}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{project.current_phase}</span>
          {project.at_risk && (
            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">⚠️ At Risk</span>
          )}
        </div>
      </div>
      <div className="space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <span className="text-gray-800">Active Contractors:</span>
          <span className="font-medium">{project.active_contractors_count}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-800">Pending Apps:</span>
          <span className="font-medium">{project.pending_payment_apps}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-800">Target Completion:</span>
          <span className="font-medium">{project.target_completion_date ? formatDate(project.target_completion_date) : "-"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-800">Budget:</span>
          <span className="font-medium">{formatCurrency(project.budget)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-800">Spent:</span>
          <span className="font-medium">{formatCurrency(project.spent)}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div className="bg-green-500 h-2.5 rounded-full transition-all" style={{ width: `${percent}%` }}></div>
        </div>
        <div className="flex justify-between text-xs mt-1 text-gray-800">
          <span className="text-gray-800">{percent}% used</span>
          <span className={percent > 90 ? "text-red-600" : "text-green-700"}>
            {percent > 90 ? "⚠️ Near limit" : "On track"}
          </span>
        </div>
      </div>
      <button
        onClick={handleCreatePaymentApps}
        disabled={loading}
        className="w-full bg-green-600 text-white py-2 rounded font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "⏳ Loading..." : "💰 Create Payment Apps"}
      </button>
    </div>
  );
}

function ActiveProjects({ projects, onCreatePaymentApps }: any) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900">
        🏗️ Active Projects
        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-normal">
          {projects.length} active
        </span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 text-gray-800">
        {projects.map((project: any) => (
          <ProjectCard key={project.id} project={project} onCreatePaymentApps={onCreatePaymentApps} />
        ))}
      </div>
    </div>
  );
}

export default function PMDashboard() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>({ pending_sms: 0, review_queue: 0, ready_checks: 0, weekly_total: 0 });
  const [paymentApps, setPaymentApps] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [paymentDocuments, setPaymentDocuments] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<'status' | 'date' | 'amount'>('status');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 5;

  // Fetch user profile
  const fetchUser = useCallback(async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    console.log("Supabase Auth user.id:", user?.id); // Debug log
    if (error || !user) return null;
    const { data, error: userError } = await supabase
      .from("users")
      .select("id, name, role, email, uuid")
      .eq("uuid", user.id)
      .single();
    console.log("Fetched user from users table:", data); // Debug log
    if (userError) return null;
    return data;
  }, []);

  // Fetch dashboard data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. User
      const userData = await fetchUser();
      setUser(userData);
      // 2. Payment Applications (with joins)
      const { data: appsRaw, error: appsError } = await supabase
        .from("payment_applications")
        .select(`
          id,
          status,
          current_payment,
          created_at,
          project:projects(id, name, client_name),
          contractor:contractors(id, name, trade),
          line_item_progress:payment_line_item_progress(
            id,
            line_item:project_line_items(id, description_of_work)
          )
        `)
        .order('created_at', { ascending: false }); // <-- Add this line
      if (appsError) throw new Error(appsError.message);
      // After fetching, sort so 'submitted' status comes first, then by created_at descending
      const sortedApps = (appsRaw || []).sort((a, b) => {
        if (a.status === 'submitted' && b.status !== 'submitted') return -1;
        if (a.status !== 'submitted' && b.status === 'submitted') return 1;
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
      setPaymentApps(sortedApps);
      // 3. Projects (with contractor count, pending apps, at_risk, etc.)
      const { data: projectsRaw, error: projectsError } = await supabase
        .from("projects")
        .select("*, id, name, client_name, current_phase, at_risk, target_completion_date, budget, spent")
        .eq("status", "active");
      if (projectsError) throw new Error(projectsError.message);
      // For each project, count active contractors and pending payment apps
      const projectsEnriched = (projectsRaw || []).map((proj: any) => {
        const active_contractors_count = paymentApps.filter(
          (app) => app.project?.id === proj.id && app.status !== "approved"
        ).length;
        const pending_payment_apps = paymentApps.filter(
          (app) => app.project?.id === proj.id && ["needs_review", "sms_complete", "submitted"].includes(app.status)
        ).length;
        return {
          ...proj,
          active_contractors_count,
          pending_payment_apps,
        };
      });
      setProjects(projectsEnriched);
      // 4. Stats
      // Pending SMS: payment apps with status 'sms_sent' or SMS conversations not completed
      const { data: smsConvos } = await supabase
        .from("payment_sms_conversations")
        .select("id, conversation_state");
      const pendingSMS = (smsConvos || []).filter((c: any) => c.conversation_state !== "completed").length;
      // Review queue: payment apps with status 'needs_review' or 'submitted'
      const reviewQueue = (appsRaw || []).filter((a: any) => ["needs_review", "submitted"].includes(a.status)).length;
      // Ready checks: payment apps with status 'check_ready' or 'approved'
      const readyChecks = (appsRaw || []).filter((a: any) => ["check_ready", "approved"].includes(a.status)).length;
      // Weekly total: sum of current_payment for apps created in the last 7 days
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weeklyTotal = (appsRaw || [])
        .filter((a: any) => a.created_at && new Date(a.created_at) >= weekAgo)
        .reduce((sum: number, a: any) => sum + (a.current_payment || 0), 0);
      setStats({
        pending_sms: pendingSMS,
        review_queue: reviewQueue,
        ready_checks: readyChecks,
        weekly_total: weeklyTotal,
      });
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [fetchUser, paymentApps]);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch payment documents for all payment applications
  useEffect(() => {
    async function fetchDocuments() {
      if (paymentApps.length === 0) return;
      const ids = paymentApps.map((app) => app.id);
      const { data, error } = await supabase
        .from("payment_documents")
        .select("*")
        .in("payment_app_id", ids);
      if (!error && data) setPaymentDocuments(data);
    }
    fetchDocuments();
  }, [paymentApps]);

  // Helper to get document for a payment app
  function getDocumentForApp(appId: number) {
    return paymentDocuments.find((doc) => doc.payment_app_id === appId);
  }

  // Add sendForSignature handler (placeholder)
  async function sendForSignature(paymentAppId: number) {
    // Call the new Node.js API route to send for signature via PDFfiller
    const res = await fetch(`/api/payments/send-docusign.js?id=${paymentAppId}`, { method: 'POST' });
    if (!res.ok) {
      const data = await res.json();
      alert('Failed to send for signature (PDFfiller): ' + (data.error || res.statusText));
      return;
    }
    alert('Payment request sent successfully');
  }

  const handleVerifyPayment = (paymentAppId: number) => {
    // Navigate to verification page
    window.location.href = `/payments/${paymentAppId}/verify`;
  };

  const handleCreatePaymentApps = async (projectId: number) => {
    window.location.href = `/dashboard/projects/${projectId}/contractors`;
  };

  // Add logout handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  // Compute filtered and sorted apps
  const filteredApps = useMemo(() => {
    let apps = [...paymentApps];
    if (statusFilter !== 'all') {
      apps = apps.filter(app => app.status === statusFilter);
    }
    if (projectFilter !== 'all') {
      apps = apps.filter(app => app.project?.id === Number(projectFilter));
    }
    // Sorting
    apps.sort((a, b) => {
      if (sortBy === 'status') {
        if (a.status === 'submitted' && b.status !== 'submitted') return -1;
        if (a.status !== 'submitted' && b.status === 'submitted') return 1;
      }
      if (sortBy === 'amount') {
        return sortDir === 'asc'
          ? a.current_payment - b.current_payment
          : b.current_payment - a.current_payment;
      }
      // Default: date
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortDir === 'asc' ? dateA - dateB : dateB - dateA;
    });
    return apps;
  }, [paymentApps, statusFilter, projectFilter, sortBy, sortDir]);

  // Pagination
  const totalPages = Math.ceil(filteredApps.length / pageSize);
  const pagedApps = filteredApps.slice((page - 1) * pageSize, page * pageSize);

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⚙️</div>
          <p className="text-lg text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-lg text-red-600">{error}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <Header onShowProfile={() => {}} onLogout={handleLogout} />
      <main className="container mx-auto p-4 md:p-6 max-w-7xl">
        {/* Refresh indicator */}
        <div className="text-right text-sm text-gray-800 mb-4">
          Last updated: {lastRefresh.toLocaleTimeString()}
          {loading && <span className="ml-2">🔄 Refreshing...</span>}
        </div>
        <OverviewStats
          pendingSMS={stats.pending_sms}
          reviewQueue={stats.review_queue}
          readyChecks={stats.ready_checks}
          weeklyTotal={stats.weekly_total}
        />
        {/* Filters and Sorting Controls */}
        <div className="flex flex-wrap gap-4 mb-6 items-center">
          <div>
            <label className="text-sm font-medium text-black mr-2">Status:</label>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="border rounded px-2 py-1 text-black">
              <option value="all">All</option>
              <option value="submitted">Submitted</option>
              <option value="needs_review">Needs Review</option>
              <option value="sms_complete">SMS Complete</option>
              <option value="approved">Approved</option>
              <option value="check_ready">Check Ready</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-black mr-2">Project:</label>
            <select value={projectFilter} onChange={e => { setProjectFilter(e.target.value); setPage(1); }} className="border rounded px-2 py-1 text-black">
              <option value="all">All</option>
              {projects.map((proj: any) => (
                <option key={proj.id} value={proj.id}>{proj.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-black mr-2">Sort By:</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="border rounded px-2 py-1 text-black">
              <option value="status">Status (Submitted First)</option>
              <option value="date">Date</option>
              <option value="amount">Amount</option>
            </select>
            <button onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')} className="ml-2 px-2 py-1 border rounded text-black">
              {sortDir === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
        {/* Payment Applications Queue with Pagination */}
        <PaymentApplicationsQueue applications={pagedApps} onVerify={handleVerifyPayment} getDocumentForApp={getDocumentForApp} sendForSignature={sendForSignature} />
        {/* Pagination Controls */}
        <div className="flex justify-center items-center gap-2 my-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50 text-black">Prev</button>
          <span className="text-sm text-black">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded disabled:opacity-50 text-black">Next</button>
        </div>
        <ActiveProjects projects={projects} onCreatePaymentApps={handleCreatePaymentApps} />
      </main>
    </div>
  );
} 