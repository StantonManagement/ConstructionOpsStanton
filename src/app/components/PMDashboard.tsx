"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import Header from "./Header";

// Utility functions
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
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
    orange: "bg-orange-100 border-orange-500 text-orange-900",
    blue: "bg-blue-100 border-blue-500 text-blue-900",
    green: "bg-green-100 border-green-500 text-green-900",
    purple: "bg-purple-100 border-purple-500 text-purple-900",
  };
  return (
    <div
      className={`border-l-4 rounded-xl p-6 ${colorClasses[color]} shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1`}
      role="region"
      aria-label={label}
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{icon}</span>
        <span className="font-semibold text-lg">{label}</span>
      </div>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm opacity-80">{subtitle}</div>
    </div>
  );
}

function OverviewStats({ pendingSMS, reviewQueue, readyChecks, weeklyTotal }: any) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard
        icon="🔄"
        label="Pending SMS"
        value={pendingSMS}
        subtitle="Waiting for responses"
        color="orange"
      />
      <StatCard
        icon="📋"
        label="Review Queue"
        value={reviewQueue}
        subtitle="Need PM verification"
        color="blue"
      />
      <StatCard
        icon="✅"
        label="Ready Checks"
        value={readyChecks}
        subtitle="Approved for pickup"
        color="green"
      />
      <StatCard
        icon="💰"
        label="This Week"
        value={formatCurrency(weeklyTotal)}
        subtitle="Total payments"
        color="purple"
      />
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
      const lineItemIds = (application.line_item_progress || [])
        .map((lip: any) => lip.line_item?.id)
        .filter(Boolean);
      if (!lineItemIds.length) return setGrandTotal(0);
      const { data, error } = await supabase
        .from("project_line_items")
        .select("amount_for_this_period")
        .in("id", lineItemIds);
      if (!error && data) {
        const total = data.reduce(
          (sum: number, pli: any) => sum + (Number(pli.amount_for_this_period) || 0),
          0
        );
        setGrandTotal(total);
      }
    }
    fetchGrandTotal();
  }, [application.line_item_progress]);

  return (
    <div
      className={`border rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 ${
        config.urgent ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-white"
      }`}
      role="article"
      aria-label={`Payment Application for ${application.project?.name}`}
    >
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <h3 className="font-semibold text-xl text-gray-900">
              {application.project?.name} - {application.contractor?.name}
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}
            >
              {config.icon} {config.label}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
            <div>
              <span className="text-gray-600 block">Amount</span>
              <div className="font-semibold text-lg text-gray-900">
                {formatCurrency(grandTotal)}
              </div>
            </div>
            <div>
              <span className="text-gray-600 block">Trade</span>
              <div className="font-semibold text-gray-900">
                {application.contractor?.trade}
              </div>
            </div>
            <div>
              <span className="text-gray-600 block">Submitted</span>
              <div className="font-semibold text-gray-900">
                {application.created_at ? formatDate(application.created_at) : "-"}
              </div>
            </div>
            <div>
              <span className="text-gray-600 block">Line Items</span>
              <div className="font-semibold text-gray-900">
                {(application.line_item_progress || []).filter((lip: any) => lip.line_item)
                  .length}{" "}
                items
              </div>
            </div>
          </div>
          {application.status === "sms_complete" && (
            <div className="text-sm text-blue-700 bg-blue-50 p-3 rounded-lg">
              📱 Contractor completed SMS responses - ready for site verification
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 lg:ml-6">
          <button
            onClick={() => onVerify(application.id)}
            className={`px-6 py-2 rounded-lg font-semibold text-white transition-all duration-200 ${
              config.urgent
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-600 hover:bg-gray-700"
            }`}
            aria-label={config.action}
          >
            {config.action}
          </button>
          {doc && (
            <>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2 bg-gray-100 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors text-center"
                aria-label="Review PDF"
              >
                Review PDF
              </a>
              <button
                onClick={() => sendForSignature(application.id)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                aria-label="Send for Signature"
              >
                Send for Signature
              </button>
            </>
          )}
        </div>
      </div>
      {doc && (
        <div className="mt-6">
          <iframe
            src={doc.url}
            width="100%"
            height="400px"
            className="border border-gray-200 rounded-lg"
            title="Payment Request PDF Preview"
          />
        </div>
      )}
    </div>
  );
}

function PaymentApplicationsQueue({
  applications,
  onVerify,
  getDocumentForApp,
  sendForSignature,
}: any) {
  const sortedApps = [...applications].sort((a, b) => {
    const priority: any = {
      needs_review: 3,
      sms_complete: 2,
      check_ready: 1,
      submitted: 3,
      approved: 1,
    };
    return (priority[b.status] || 0) - (priority[a.status] || 0);
  });
  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          💰 Payment Applications Queue
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            {applications.length} active
          </span>
        </h2>
      </div>
      <div className="space-y-6">
        {sortedApps.map((app) => (
          <PaymentAppCard
            key={app.id}
            application={app}
            onVerify={onVerify}
            getDocumentForApp={getDocumentForApp}
            sendForSignature={sendForSignature}
          />
        ))}
        {applications.length === 0 && (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-xl shadow-sm">
            <p className="text-lg text-gray-600 mb-2">
              📭 No active payment applications
            </p>
            <p className="text-sm text-gray-500">
              Create payment apps from projects below
            </p>
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
      console.error("Failed to create payment apps:", error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div
      className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
      role="article"
      aria-label={`Project ${project.name}`}
    >
      <div className="mb-4">
        <h3 className="font-semibold text-xl text-gray-900">{project.name}</h3>
        <p className="text-sm text-gray-600">{project.client_name}</p>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
            {project.current_phase}
          </span>
          {project.at_risk && (
            <span className="text-xs bg-red-100 text-red-800 px-3 py-1 rounded-full">
              ⚠️ At Risk
            </span>
          )}
        </div>
      </div>
      <div className="space-y-3 text-sm mb-6">
        <div className="flex justify-between">
          <span className="text-gray-600">Active Contractors</span>
          <span className="font-medium text-gray-900">
            {project.active_contractors_count}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Pending Apps</span>
          <span className="font-medium text-gray-900">
            {project.pending_payment_apps}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Target Completion</span>
          <span className="font-medium text-gray-900">
            {project.target_completion_date
              ? formatDate(project.target_completion_date)
              : "-"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Budget</span>
          <span className="font-medium text-gray-900">
            {formatCurrency(project.budget)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Spent</span>
          <span className="font-medium text-gray-900">
            {formatCurrency(project.spent)}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`bg-green-500 h-3 rounded-full transition-all duration-500`}
            style={{ width: `${percent}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs mt-2">
          <span className="text-gray-600">{percent}% used</span>
          <span
            className={percent > 90 ? "text-red-600 font-medium" : "text-green-600 font-medium"}
          >
            {percent > 90 ? "⚠️ Near limit" : "On track"}
          </span>
        </div>
      </div>
      <button
        onClick={handleCreatePaymentApps}
        disabled={loading}
        className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        aria-label="Create Payment Apps"
      >
        {loading ? "⏳ Loading..." : "💰 Create Payment Apps"}
      </button>
    </div>
  );
}

function ActiveProjects({ projects, onCreatePaymentApps }: any) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          🏗️ Active Projects
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
            {projects.length} active
          </span>
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects.map((project: any) => (
          <ProjectCard
            key={project.id}
            project={project}
            onCreatePaymentApps={onCreatePaymentApps}
          />
        ))}
      </div>
    </div>
  );
}

export default function PMDashboard() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>({
    pending_sms: 0,
    review_queue: 0,
    ready_checks: 0,
    weekly_total: 0,
  });
  const [paymentApps, setPaymentApps] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [paymentDocuments, setPaymentDocuments] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<"status" | "date" | "amount">("status");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  // Fetch user profile
  const fetchUser = useCallback(async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    const { data, error: userError } = await supabase
      .from("users")
      .select("id, name, role, email, uuid")
      .eq("uuid", user.id)
      .single();
    if (userError) return null;
    return data;
  }, []);

  // Fetch dashboard data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userData = await fetchUser();
      setUser(userData);
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
        .order("created_at", { ascending: false });
      if (appsError) throw new Error(appsError.message);
      const sortedApps = (appsRaw || []).sort((a, b) => {
        if (a.status === "submitted" && b.status !== "submitted") return -1;
        if (a.status !== "submitted" && b.status === "submitted") return 1;
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
      setPaymentApps(sortedApps);
      const { data: projectsRaw, error: projectsError } = await supabase
        .from("projects")
        .select("*, id, name, client_name, current_phase, at_risk, target_completion_date, budget, spent")
        .eq("status", "active");
      if (projectsError) throw new Error(projectsError.message);
      const projectsEnriched = (projectsRaw || []).map((proj: any) => {
        const active_contractors_count = paymentApps.filter(
          (app) => app.project?.id === proj.id && app.status !== "approved"
        ).length;
        const pending_payment_apps = paymentApps.filter(
          (app) =>
            app.project?.id === proj.id &&
            ["needs_review", "sms_complete", "submitted"].includes(app.status)
        ).length;
        return {
          ...proj,
          active_contractors_count,
          pending_payment_apps,
        };
      });
      setProjects(projectsEnriched);
      const { data: smsConvos } = await supabase
        .from("payment_sms_conversations")
        .select("id, conversation_state");
      const pendingSMS = (smsConvos || []).filter(
        (c: any) => c.conversation_state !== "completed"
      ).length;
      const reviewQueue = (appsRaw || []).filter((a: any) =>
        ["needs_review", "submitted"].includes(a.status)
      ).length;
      const readyChecks = (appsRaw || []).filter((a: any) =>
        ["check_ready", "approved"].includes(a.status)
      ).length;
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
  }, [loadDashboardData]);

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

  function getDocumentForApp(appId: number) {
    return paymentDocuments.find((doc) => doc.payment_app_id === appId);
  }

  async function sendForSignature(paymentAppId: number) {
    const res = await fetch(`/api/payments/send-docusign?id=${paymentAppId}`, {
      method: "POST",
    });
    if (!res.ok) {
      const data = await res.json();
      alert("Failed to send for signature (PDFfiller): " + (data.error || res.statusText));
      return;
    }
    alert("Payment request sent successfully");
  }

  const handleVerifyPayment = (paymentAppId: number) => {
    window.location.href = `/payments/${paymentAppId}/verify`;
  };

  const handleCreatePaymentApps = async (projectId: number) => {
    window.location.href = `/dashboard/projects/${projectId}/contractors`;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const filteredApps = useMemo(() => {
    let apps = [...paymentApps];
    if (statusFilter !== "all") {
      apps = apps.filter((app) => app.status === statusFilter);
    }
    if (projectFilter !== "all") {
      apps = apps.filter((app) => app.project?.id === Number(projectFilter));
    }
    apps.sort((a, b) => {
      if (sortBy === "status") {
        if (a.status === "submitted" && b.status !== "submitted") return -1;
        if (a.status !== "submitted" && b.status === "submitted") return 1;
      }
      if (sortBy === "amount") {
        return sortDir === "asc"
          ? a.current_payment - b.current_payment
          : b.current_payment - a.current_payment;
      }
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortDir === "asc" ? dateA - dateB : dateB - dateA;
    });
    return apps;
  }, [paymentApps, statusFilter, projectFilter, sortBy, sortDir]);

  const totalPages = Math.ceil(filteredApps.length / pageSize);
  const pagedApps = filteredApps.slice((page - 1) * pageSize, page * pageSize);

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-5xl mb-4 text-blue-600">⚙️</div>
          <p className="text-lg text-gray-700">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 text-red-600">❌</div>
          <p className="text-lg text-red-600">{error}</p>
          <button
            onClick={loadDashboardData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all"
            aria-label="Retry loading dashboard"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-100">
      <Header onShowProfile={() => {}} onLogout={handleLogout} />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <div className="text-sm text-gray-600">
            Last updated: {lastRefresh.toLocaleTimeString()}
            {loading && (
              <span className="ml-2 text-blue-600 animate-pulse">🔄 Refreshing...</span>
            )}
          </div>
        </div>
        <OverviewStats
          pendingSMS={stats.pending_sms}
          reviewQueue={stats.review_queue}
          readyChecks={stats.ready_checks}
          weeklyTotal={stats.weekly_total}
        />
        <div className="flex flex-col sm:flex-row gap-4 mb-8 bg-white p-6 rounded-xl shadow-sm">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              aria-label="Filter by status"
            >
              <option value="all">All</option>
              <option value="submitted">Submitted</option>
              <option value="needs_review">Needs Review</option>
              <option value="sms_complete">SMS Complete</option>
              <option value="approved">Approved</option>
              <option value="check_ready">Check Ready</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Project
            </label>
            <select
              value={projectFilter}
              onChange={(e) => {
                setProjectFilter(e.target.value);
                setPage(1);
              }}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              aria-label="Filter by project"
            >
              <option value="all">All</option>
              {projects.map((proj: any) => (
                <option key={proj.id} value={proj.id}>
                  {proj.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Sort By
            </label>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                aria-label="Sort by"
              >
                <option value="status">Status (Submitted First)</option>
                <option value="date">Date</option>
                <option value="amount">Amount</option>
              </select>
              <button
                onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label={`Sort ${sortDir === "asc" ? "descending" : "ascending"}`}
              >
                {sortDir === "asc" ? "↑" : "↓"}
              </button>
            </div>
          </div>
        </div>
        <PaymentApplicationsQueue
          applications={pagedApps}
          onVerify={handleVerifyPayment}
          getDocumentForApp={getDocumentForApp}
          sendForSignature={sendForSignature}
        />
        <div className="flex justify-center items-center gap-4 my-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            aria-label="Previous page"
          >
            Prev
          </button>
          <span className="text-sm text-gray-700">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            aria-label="Next page"
          >
            Next
          </button>
        </div>
        <ActiveProjects projects={projects} onCreatePaymentApps={handleCreatePaymentApps} />
      </main>
    </div>
  );
}