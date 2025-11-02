// import React, { useState, useEffect } from 'react';
// import Layout from '../components/layout/Layout';
// import LoadingSpinner from '../components/common/LoadingSpinner';
// import { adminService } from '../services/admin.service';
// import { ActivityLog } from '../types';
// import { Activity, TrendingUp, Users, Clock, Zap, Filter, Download, RefreshCw } from 'lucide-react';

// // Extended type to include additional properties we need
// interface ExtendedActivityLog extends ActivityLog {
//   status_code?: number;
//   duration?: number;
// }

// const ActivityLogsPage: React.FC = () => {
//   const [logs, setLogs] = useState<ExtendedActivityLog[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
//   const [stats, setStats] = useState({
//     totalRequests: 0,
//     uniqueUsers: 0,
//     averageResponseTime: 0,
//     errorRate: 0
//   });

//   useEffect(() => {
//     loadLogs();
//   }, [timeRange]);

//   const loadLogs = async () => {
//     try {
//       setLoading(true);
//       const data = await adminService.getLogs();
//       const logsWithMetadata = (data.logs || []).map((log: ActivityLog) => ({
//         ...log,
//         status_code: Math.random() > 0.1 ? 200 : 400, // Mock status code
//         duration: Math.random() * 200 + 50 // Mock duration in ms
//       }));
      
//       setLogs(logsWithMetadata);
      
//       // Calculate stats from logs
//       const uniqueUsers = new Set(logsWithMetadata.map((log: { user_id: any; }) => log.user_id).filter(Boolean)).size;
//       const totalRequests = logsWithMetadata.length;
//       const errorCount = logsWithMetadata.filter((log: ExtendedActivityLog) => 
//         log.status_code && log.status_code >= 400
//       ).length;
      
//       const totalDuration = logsWithMetadata.reduce((sum: number, log: ExtendedActivityLog) => 
//         sum + (log.duration || 0), 0
//       );
      
//       setStats({
//         totalRequests,
//         uniqueUsers,
//         averageResponseTime: totalRequests > 0 ? Math.round(totalDuration / totalRequests) : 0,
//         errorRate: totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0
//       });
//     } catch (error) {
//       console.error('Failed to load logs:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getMethodColor = (method: string) => {
//     switch (method) {
//       case 'GET':
//         return 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800';
//       case 'POST':
//         return 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800';
//       case 'PUT':
//         return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
//       case 'DELETE':
//         return 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800';
//       default:
//         return 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800';
//     }
//   };

//   const getStatusColor = (status: number) => {
//     if (status >= 200 && status < 300) return 'text-green-600 dark:text-green-400';
//     if (status >= 300 && status < 400) return 'text-blue-600 dark:text-blue-400';
//     if (status >= 400 && status < 500) return 'text-yellow-600 dark:text-yellow-400';
//     return 'text-red-600 dark:text-red-400';
//   };

//   const getStatusText = (status: number) => {
//     if (status >= 200 && status < 300) return 'Success';
//     if (status >= 300 && status < 400) return 'Redirect';
//     if (status >= 400 && status < 500) return 'Client Error';
//     return 'Server Error';
//   };

//   // Mock data for charts - generating based on time range
//   const generateChartData = (count: number, baseValue: number, variation: number) => {
//     return Array.from({ length: count }, (_, i) => 
//       baseValue + Math.sin(i * 0.5) * variation + Math.random() * 20
//     );
//   };

//   const getDataPointsCount = () => {
//     switch (timeRange) {
//       case '1h': return 12; // 5-minute intervals
//       case '24h': return 24; // 1-hour intervals
//       case '7d': return 7; // 1-day intervals
//       case '30d': return 30; // 1-day intervals
//       default: return 12;
//     }
//   };

//   const dataPoints = getDataPointsCount();
//   const requestData = generateChartData(dataPoints, 50, 30);
//   const responseTimeData = generateChartData(dataPoints, 150, 50);
// // // 
// //   const getTimeLabels = () => {
// //     switch (timeRange) {
// //       case '1h':
// //         return Array.from({ length: dataPoints }, (_, i) => 
// //           `${i * 5}min`
// //         );
// //       case '24h':
// //         return Array.from({ length: dataPoints }, (_, i) => 
// //           `${i}:00`
// //         );
// //       case '7d':
// //         return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// //       case '30d':
// //         return Array.from({ length: dataPoints }, (_, i) => 
// //           `Day ${i + 1}`
// //         );
// //       default:
// //         return Array.from({ length: dataPoints }, (_, i) => `${i}`);
// //     }
// //   };

// //   const timeLabels = getTimeLabels();

//   const exportLogs = () => {
//     const csvContent = [
//       ['Method', 'Path', 'User ID', 'Status', 'Duration', 'Timestamp'],
//       ...logs.map(log => [
//         log.method,
//         log.path,
//         log.user_id || 'N/A',
//         log.status_code || 'N/A',
//         log.duration ? `${log.duration}ms` : 'N/A',
//         new Date(log.timestamp).toLocaleString()
//       ])
//     ].map(row => row.join(',')).join('\n');

//     const blob = new Blob([csvContent], { type: 'text/csv' });
//     const url = window.URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     window.URL.revokeObjectURL(url);
//   };

//   if (loading) {
//     return (
//       <Layout>
//         <LoadingSpinner />
//       </Layout>
//     );
//   }

//   return (
//     <Layout>
//       <div className="max-w-7xl mx-auto space-y-6">
//         {/* Header */}
//         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
//           <div className="flex items-center gap-3">
//             <div className="p-2 bg-linear-to-br from-primary-500 to-primary-600 rounded-xl">
//               <Activity className="w-6 h-6 text-white" />
//             </div>
//             <div>
//               <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Activity Dashboard</h1>
//               <p className="text-gray-600 dark:text-gray-400">Real-time platform performance & analytics</p>
//             </div>
//           </div>
          
//           <div className="flex items-center gap-3">
//             <select 
//               value={timeRange}
//               onChange={(e) => setTimeRange(e.target.value as any)}
//               className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//             >
//               <option value="1h">Last 1 hour</option>
//               <option value="24h">Last 24 hours</option>
//               <option value="7d">Last 7 days</option>
//               <option value="30d">Last 30 days</option>
//             </select>
            
//             <button 
//               onClick={loadLogs}
//               className="p-2 border cursor-pointer border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
//             >
//               <RefreshCw className="w-5 h-5" />
//             </button>
            
//             <button 
//               onClick={exportLogs}
//               className="px-4 cursor-pointer py-2 bg-linear-to-br from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all flex items-center gap-2"
//             >
//               <Download className="w-4 h-4" />
//               Export
//             </button>
//           </div>
//         </div>

//         {/* Stats Grid */}
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//           <div className="bg-linear-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-blue-100 text-sm font-medium">Total Requests</p>
//                 <p className="text-3xl font-bold mt-2">{stats.totalRequests.toLocaleString()}</p>
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