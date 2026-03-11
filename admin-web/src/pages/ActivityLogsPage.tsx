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
//               </div>
//               <TrendingUp className="w-8 h-8 text-blue-200" />
//             </div>
//             <div className="flex items-center gap-1 mt-4">
//               <TrendingUp className="w-4 h-4" />
//               <span className="text-sm text-blue-100">+12% from yesterday</span>
//             </div>
//           </div>

//           <div className="bg-linear-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-green-100 text-sm font-medium">Unique Users</p>
//                 <p className="text-3xl font-bold mt-2">{stats.uniqueUsers}</p>
//               </div>
//               <Users className="w-8 h-8 text-green-200" />
//             </div>
//             <div className="flex items-center gap-1 mt-4">
//               <TrendingUp className="w-4 h-4" />
//               <span className="text-sm text-green-100">+8% from yesterday</span>
//             </div>
//           </div>

//           <div className="bg-linear-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-purple-100 text-sm font-medium">Avg. Response</p>
//                 <p className="text-3xl font-bold mt-2">{stats.averageResponseTime}ms</p>
//               </div>
//               <Zap className="w-8 h-8 text-purple-200" />
//             </div>
//             <div className="flex items-center gap-1 mt-4">
//               <TrendingUp className="w-4 h-4" />
//               <span className="text-sm text-purple-100">-5% from yesterday</span>
//             </div>
//           </div>

//           <div className="bg-linear-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-orange-100 text-sm font-medium">Error Rate</p>
//                 <p className="text-3xl font-bold mt-2">{stats.errorRate.toFixed(1)}%</p>
//               </div>
//               <Activity className="w-8 h-8 text-orange-200" />
//             </div>
//             <div className="flex items-center gap-1 mt-4">
//               <TrendingUp className="w-4 h-4" />
//               <span className="text-sm text-orange-100">-2% from yesterday</span>
//             </div>
//           </div>
//         </div>

//         {/* Charts Section */}
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//           {/* Requests Over Time */}
//           <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
//             <div className="flex items-center justify-between mb-6">
//               <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Requests Over Time</h3>
//               <Filter className="w-5 h-5 text-gray-500" />
//             </div>
//             <div className="h-48 flex items-end gap-1 pb-4">
//               {requestData.map((value, index) => (
//                 <div key={index} className="flex-1 flex flex-col items-center">
//                   <div
//                     className="w-full bg-linear-to-t from-blue-500 to-blue-600 rounded-t-lg transition-all hover:from-blue-400 hover:to-blue-500 cursor-pointer"
//                     style={{ height: `${(value / Math.max(...requestData)) * 80}%` }}
//                     title={`${Math.round(value)} requests`}
//                   />
//                   {/* <span className="text-xs text-gray-500 mt-1">{timeLabels[index]}</span> */}
//                 </div>
//               ))}
//             </div>
//           </div>

//           {/* Response Times */}
//           <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
//             <div className="flex items-center justify-between mb-6">
//               <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Response Times</h3>
//               <Clock className="w-5 h-5 text-gray-500" />
//             </div>
//             <div className="h-48">
//               <div className="relative h-full flex items-end gap-1 pb-4">
//                 {responseTimeData.map((value, index) => (
//                   <div key={index} className="flex-1 flex flex-col items-center">
//                     <div
//                       className="w-full bg-linear-to-t from-green-500 to-green-600 rounded-t-lg transition-all hover:from-green-400 hover:to-green-500 cursor-pointer"
//                       style={{ height: `${(value / Math.max(...responseTimeData)) * 80}%` }}
//                       title={`${Math.round(value)}ms`}
//                     />
//                     {/* <span className="text-xs text-gray-500 mt-1">{timeLabels[index]}</span> */}
//                   </div>
//                 ))}
//                 <div className="absolute top-1/2 left-0 right-0 border-t border-gray-300 dark:border-gray-600 border-dashed" />
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Activity Logs Table */}
//         <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
//           <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
//             <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
//             <span className="text-sm text-gray-500 dark:text-gray-400">
//               Showing {Math.min(logs.length, 10)} of {logs.length} logs
//             </span>
//           </div>

//           <div className="overflow-x-auto">
//             <table className="w-full">
//               <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
//                 <tr>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
//                     Method
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
//                     Endpoint
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
//                     Status
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
//                     User
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
//                     Duration
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
//                     Timestamp
//                   </th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
//                 {logs.slice(0, 10).map((log) => (
//                   <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
//                     <td className="px-6 py-4 whitespace-nowrap">
//                       <span className={`px-3 py-1.5 text-xs font-medium rounded-full border ${getMethodColor(log.method)}`}>
//                         {log.method}
//                       </span>
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-mono max-w-xs truncate">
//                       {log.path}
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap">
//                       <div className="flex flex-col">
//                         <span className={`text-sm font-medium ${getStatusColor(log.status_code || 200)}`}>
//                           {log.status_code || 200}
//                         </span>
//                         <span className="text-xs text-gray-500 dark:text-gray-400">
//                           {getStatusText(log.status_code || 200)}
//                         </span>
//                       </div>
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 font-mono">
//                       {log.user_id ? (
//                         <div className="flex items-center gap-2">
//                           <div className="w-2 h-2 bg-green-500 rounded-full"></div>
//                           {log.user_id.substring(0, 8)}...
//                         </div>
//                       ) : (
//                         'N/A'
//                       )}
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
//                       {log.duration ? `${Math.round(log.duration)}ms` : 'N/A'}
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
//                       {new Date(log.timestamp).toLocaleString()}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>

//         {logs.length === 0 && (
//           <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
//             <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
//             <p className="text-gray-600 dark:text-gray-400 text-lg">No activity logs found</p>
//             <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
//               Activity will appear here as users interact with your platform
//             </p>
//           </div>
//         )}
//       </div>
//     </Layout>
//   );
// };

// export default ActivityLogsPage;
