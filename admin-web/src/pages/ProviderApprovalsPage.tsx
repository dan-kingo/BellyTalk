import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  FileText,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import Dialog from "../components/common/Dialog";
import ToastBanner from "../components/common/ToastBanner";
import Layout from "../components/layout/Layout";
import { adminService } from "../services/admin.service";
import { ProviderApproval } from "../types";

type ProviderStatus = "pending" | "approved" | "rejected";

const ProviderApprovalsPage: React.FC = () => {
  const [providers, setProviders] = useState<ProviderApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProviderStatus>("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectCandidate, setRejectCandidate] =
    useState<ProviderApproval | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "error" | "info";
  } | null>(null);

  const loadProviders = async (
    status: ProviderStatus,
    showRefreshing = false,
  ) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      const response = await adminService.listProviders(status);
      setProviders(response.providers || []);
    } catch (loadError: any) {
      setError(loadError?.response?.data?.error || "Failed to load providers");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProviders(statusFilter).catch(() => null);
  }, [statusFilter]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredProviders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return providers;

    return providers.filter((provider) => {
      const requestedRole = provider.extra?.requested_role || provider.role;

      return [
        provider.full_name,
        provider.email,
        provider.role,
        provider.role_status,
        requestedRole,
        provider.phone,
        provider.location,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [providers, searchQuery]);

  const handleApprove = async (provider: ProviderApproval) => {
    try {
      setProcessingId(provider.id);
      await adminService.approveProvider(provider.id);
      setProviders((current) =>
        current.filter((item) => item.id !== provider.id),
      );
      setToast({
        message: `${provider.full_name} was approved successfully.`,
        variant: "success",
      });
    } catch (approveError: any) {
      setToast({
        message:
          approveError?.response?.data?.error || "Failed to approve provider",
        variant: "error",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectCandidate || !rejectReason.trim()) return;

    try {
      setProcessingId(rejectCandidate.id);
      await adminService.rejectProvider(
        rejectCandidate.id,
        rejectReason.trim(),
      );
      setProviders((current) =>
        current.filter((item) => item.id !== rejectCandidate.id),
      );
      setToast({
        message: `${rejectCandidate.full_name} was rejected.`,
        variant: "success",
      });
      setRejectCandidate(null);
      setRejectReason("");
    } catch (rejectError: any) {
      setToast({
        message:
          rejectError?.response?.data?.error || "Failed to reject provider",
        variant: "error",
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Provider Approvals
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Review doctor and provider applications with the admin provider
              endpoints.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search providers"
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as ProviderStatus)
              }
              className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <button
              type="button"
              onClick={() => loadProviders(statusFilter, true)}
              disabled={loading || refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-white disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        {toast && (
          <ToastBanner
            message={toast.message}
            variant={toast.variant}
            onClose={() => setToast(null)}
          />
        )}

        {error && !toast && <ToastBanner message={error} variant="error" />}

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            Loading providers...
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-800">
            <FileText className="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-gray-500" />
            <p className="text-gray-700 dark:text-gray-300">
              No providers found for this filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredProviders.map((provider) => {
              const requestedRole =
                provider.extra?.requested_role || provider.role;
              const documents = Array.isArray(
                provider.extra?.verification_documents,
              )
                ? provider.extra.verification_documents
                : Array.isArray(provider.extra?.documents)
                  ? provider.extra.documents
                  : [];

              return (
                <div
                  key={provider.id}
                  className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {provider.full_name}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {provider.email}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary dark:bg-secondary/10 dark:text-secondary">
                          Requested: {requestedRole}
                        </span>
                        <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                          Current role: {provider.role}
                        </span>
                        <span className="rounded-full bg-yellow-100 px-3 py-1 font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                          Status: {provider.role_status || statusFilter}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2 text-sm text-gray-600 dark:text-gray-300 sm:grid-cols-2">
                        <p>Phone: {provider.phone || "-"}</p>
                        <p>Location: {provider.location || "-"}</p>
                        <p>
                          Submitted:{" "}
                          {new Date(
                            provider.updated_at || provider.created_at,
                          ).toLocaleString()}
                        </p>
                        <p>ID: {provider.id}</p>
                      </div>

                      {provider.bio && (
                        <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                          {provider.bio}
                        </div>
                      )}

                      <div>
                        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          Submitted Documents
                        </p>
                        {documents.length === 0 ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            No documents attached.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {documents.map((documentUrl, index) => (
                              <a
                                key={`${provider.id}-${index}`}
                                href={documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
                              >
                                Document {index + 1}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      {provider.extra?.rejection_reason && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                          Rejection reason: {provider.extra.rejection_reason}
                        </div>
                      )}
                    </div>

                    {statusFilter === "pending" && (
                      <div className="flex shrink-0 flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => handleApprove(provider)}
                          disabled={processingId === provider.id}
                          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectCandidate(provider)}
                          disabled={processingId === provider.id}
                          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white disabled:opacity-60"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Dialog
          isOpen={!!rejectCandidate}
          onClose={() => {
            if (!processingId) {
              setRejectCandidate(null);
              setRejectReason("");
            }
          }}
          title="Reject Provider Request"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Add a rejection reason for{" "}
              <span className="font-medium">{rejectCandidate?.full_name}</span>.
            </p>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleReject}
                disabled={
                  !rejectReason.trim() || processingId === rejectCandidate?.id
                }
                className="rounded-lg bg-red-600 px-4 py-2 text-white disabled:opacity-60"
              >
                {processingId === rejectCandidate?.id
                  ? "Rejecting..."
                  : "Reject provider"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRejectCandidate(null);
                  setRejectReason("");
                }}
                disabled={processingId === rejectCandidate?.id}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 dark:border-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </Dialog>
      </div>
    </Layout>
  );
};

export default ProviderApprovalsPage;
