import React, { useEffect, useMemo, useState } from "react";
import { Activity, RefreshCw, Search } from "lucide-react";
import ToastBanner from "../components/common/ToastBanner";
import Layout from "../components/layout/Layout";
import { adminService } from "../services/admin.service";
import { ActivityLog } from "../types";

const ActivityLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");

  const loadLogs = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      const response = await adminService.getLogs();
      setLogs(response.logs || []);
    } catch (loadError: any) {
      setError(
        loadError?.response?.data?.error || "Failed to load activity logs",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLogs().catch(() => null);
  }, []);

  const filteredLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesMethod =
        methodFilter === "all" || log.method === methodFilter;
      if (!matchesMethod) return false;
      if (!query) return true;

      return [
        log.method,
        log.path,
        log.user_id || "",
        log.timestamp || log.created_at || "",
      ].some((value) => String(value).toLowerCase().includes(query));
    });
  }, [logs, methodFilter, searchQuery]);

  const uniqueUsers = new Set(logs.map((log) => log.user_id).filter(Boolean))
    .size;
  const methodsUsed = new Set(logs.map((log) => log.method)).size;
  const latestLogTime = logs[0]?.timestamp || logs[0]?.created_at;

  const methodBadgeClass = (method: string) => {
    if (method === "GET")
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400";
    if (method === "POST")
      return "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400";
    if (method === "PUT" || method === "PATCH") {
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400";
    }
    if (method === "DELETE")
      return "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400";
    return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Activity Logs
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Inspect recent admin API activity from the backend logging
              endpoint.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search path, user or method"
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <select
              value={methodFilter}
              onChange={(event) => setMethodFilter(event.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="all">All methods</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>

            <button
              type="button"
              onClick={() => loadLogs(true)}
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

        {error && <ToastBanner message={error} variant="error" />}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Recent entries
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {logs.length}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Unique users
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {uniqueUsers}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Latest activity
            </p>
            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
              {latestLogTime ? new Date(latestLogTime).toLocaleString() : "-"}
            </p>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Methods used: {methodsUsed}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            Loading activity logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-800">
            <Activity className="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-gray-500" />
            <p className="text-gray-700 dark:text-gray-300">
              No activity logs match this filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Method
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Path
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredLogs.map((log) => {
                  const logTime = log.timestamp || log.created_at;

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900/30"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${methodBadgeClass(log.method)}`}
                        >
                          {log.method}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {log.path}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {log.user_id || "Anonymous"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {logTime ? new Date(logTime).toLocaleString() : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ActivityLogsPage;
