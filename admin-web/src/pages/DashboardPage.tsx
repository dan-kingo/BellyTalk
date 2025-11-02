import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { adminService } from '../services/admin.service';
import { 
  Users, 
  FileText, 
  MessageSquare, 
  TrendingUp, 
  Activity,
  BarChart3,
  PieChart,
  Calendar,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { OverviewStats } from '../types';

// Mock data for charts
const generateLineData = (count: number, base: number, variation: number) => {
  return Array.from({ length: count }, (_, i) => 
    Math.max(0, base + Math.sin(i * 0.5) * variation + (Math.random() - 0.5) * 20)
  );
};

const generateBarData = (count: number, max: number) => {
  return Array.from({ length: count }, () => Math.floor(Math.random() * max) + 50);
};

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  // Mock performance data with proper values for visibility
  const [performanceData] = useState({
    userGrowth: generateLineData(7, 100, 30),
    contentCreation: generateLineData(7, 50, 20),
    hospitalEngagement: generateBarData(5, 150), // Increased max value for better visibility
    messageActivity: generateLineData(7, 200, 80), // Increased base and variation
    platformMetrics: {
      uptime: 99.8,
      responseTime: 124,
      errorRate: 0.2,
      satisfaction: 4.7
    },
    topHospitals: [
      { name: 'General Hospital', users: 245, growth: 12 },
      { name: 'City Medical', users: 189, growth: 8 },
      { name: 'Community Health', users: 156, growth: -2 },
      { name: 'Regional Center', users: 134, growth: 15 },
      { name: 'University Hospital', users: 98, growth: 5 }
    ]
  });

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    try {
      setLoading(true);
      const data = await adminService.getOverview();
      setStats(data);
    } catch (error) {
      console.error('Failed to load overview:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeLabels = () => {
    switch (timeRange) {
      case '7d':
        return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      case '30d':
        return ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      case '90d':
        return ['Month 1', 'Month 2', 'Month 3'];
      default:
        return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    }
  };

  const timeLabels = getTimeLabels();

  // Ensure we have valid data for charts
  const hospitalData = performanceData.hospitalEngagement || [50, 75, 100, 125, 150];
  const messageData = performanceData.messageActivity || [150, 180, 200, 220, 250, 230, 210];
  const maxHospitalValue = Math.max(...hospitalData);
  const maxMessageValue = Math.max(...messageData);

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">Welcome to BellyTalk Admin Panel</p>
          </div>
          <div className="flex items-center gap-3">
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <Calendar className="w-5 h-5 text-gray-500" />
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-linear-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Users</p>
                <p className="text-3xl font-bold mt-2">{stats?.users || 0}</p>
              </div>
              <Users className="w-8 h-8 text-blue-200" />
            </div>
            <div className="flex items-center gap-1 mt-4">
              <ArrowUp className="w-4 h-4" />
              <span className="text-sm text-blue-100">+12.5% from last period</span>
            </div>
          </div>

          <div className="bg-linear-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Content Pieces</p>
                <p className="text-3xl font-bold mt-2">{stats?.contents || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-green-200" />
            </div>
            <div className="flex items-center gap-1 mt-4">
              <ArrowUp className="w-4 h-4" />
              <span className="text-sm text-green-100">+8.3% from last period</span>
            </div>
          </div>

          <div className="bg-linear-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Messages</p>
                <p className="text-3xl font-bold mt-2">{stats?.messages || 0}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-purple-200" />
            </div>
            <div className="flex items-center gap-1 mt-4">
              <ArrowUp className="w-4 h-4" />
              <span className="text-sm text-purple-100">+23.1% from last period</span>
            </div>
          </div>

          <div className="bg-linear-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Hospitals</p>
                <p className="text-3xl font-bold mt-2">24</p>
              </div>
              <Activity className="w-8 h-8 text-orange-200" />
            </div>
            <div className="flex items-center gap-1 mt-4">
              <ArrowUp className="w-4 h-4" />
              <span className="text-sm text-orange-100">+2 new this month</span>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Growth Line Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-blue-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Growth</h3>
              </div>
              <span className="text-sm text-green-500 font-medium">+12.5%</span>
            </div>
            <div className="h-48 flex items-end gap-2 pb-4">
              {performanceData.userGrowth.map((value, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-linear-to-t from-blue-500 to-blue-600 rounded-t-lg transition-all hover:from-blue-400 hover:to-blue-500 cursor-pointer relative group"
                    style={{ height: `${(value / Math.max(...performanceData.userGrowth)) * 80}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {Math.round(value)}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 mt-2">{timeLabels[index]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Content Creation Line Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-green-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Content Creation</h3>
              </div>
              <span className="text-sm text-green-500 font-medium">+8.3%</span>
            </div>
            <div className="h-48 flex items-end gap-2 pb-4">
              {performanceData.contentCreation.map((value, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-linear-to-t from-green-500 to-green-600 rounded-t-lg transition-all hover:from-green-400 hover:to-green-500 cursor-pointer relative group"
                    style={{ height: `${(value / Math.max(...performanceData.contentCreation)) * 80}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {Math.round(value)}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 mt-2">{timeLabels[index]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Metrics & Hospital Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Performance Indicators */}
          <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="w-6 h-6 text-purple-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Performance</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Uptime</span>
                <span className="text-lg font-semibold text-green-500">{performanceData.platformMetrics.uptime}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${performanceData.platformMetrics.uptime}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Avg. Response</span>
                <span className="text-lg font-semibold text-blue-500">{performanceData.platformMetrics.responseTime}ms</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ width: `${(300 - performanceData.platformMetrics.responseTime) / 300 * 100}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Error Rate</span>
                <span className="text-lg font-semibold text-red-500">{performanceData.platformMetrics.errorRate}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full" 
                  style={{ width: `${performanceData.platformMetrics.errorRate}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Satisfaction</span>
                <span className="text-lg font-semibold text-yellow-500">{performanceData.platformMetrics.satisfaction}/5</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full" 
                  style={{ width: `${(performanceData.platformMetrics.satisfaction / 5) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Hospital Comparison Bar Chart - FIXED */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-orange-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Hospital Engagement</h3>
              </div>
              <span className="text-sm text-gray-500">Active Users</span>
            </div>
            <div className="h-64 flex items-end gap-4 pb-4 px-2">
              {hospitalData.map((value, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="flex flex-col items-center h-full justify-end">
                    <div
                      className="w-full max-w-[60px] bg-linear-to-t from-orange-500 to-orange-600 rounded-t-lg transition-all hover:from-orange-400 hover:to-orange-500 cursor-pointer relative group min-h-5"
                      style={{ height: `${(value / maxHospitalValue) * 90}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {value} users
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 mt-2 text-center leading-tight font-medium">
                      Hosp. {index + 1}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2 px-2">
              <span>Low</span>
              <span>Engagement</span>
              <span>High</span>
            </div>
          </div>
        </div>

        {/* Top Hospitals & Message Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Hospitals List */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <PieChart className="w-6 h-6 text-indigo-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Hospitals</h3>
            </div>
            <div className="space-y-4">
              {performanceData.topHospitals.map((hospital, index) => (
                <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{hospital.name}</p>
                      <p className="text-sm text-gray-500">{hospital.users} users</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 ${hospital.growth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {hospital.growth >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    <span className="text-sm font-medium">{Math.abs(hospital.growth)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Message Activity Chart - FIXED */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-cyan-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Message Activity</h3>
              </div>
              <span className="text-sm text-green-500 font-medium">+23.1%</span>
            </div>
            <div className="h-48 flex items-end gap-2 pb-4">
              {messageData.slice(0, timeLabels.length).map((value, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-linear-to-t from-cyan-500 to-cyan-600 rounded-t-lg transition-all hover:from-cyan-400 hover:to-cyan-500 cursor-pointer relative group"
                    style={{ height: `${(value / maxMessageValue) * 80}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {Math.round(value)}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 mt-2">{timeLabels[index]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;