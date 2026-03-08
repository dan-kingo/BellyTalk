import React, { useState, useEffect } from "react";
import Layout from "../components/layout/Layout";
import { DashboardPageSkeleton } from "../components/common/PageSkeletons";
import { useAdminStore } from "../stores/admin.store";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from "chart.js";
import { Line, Bar, Doughnut, Radar } from "react-chartjs-2";
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
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Tooltip,
  Legend,
  Filler,
);

// Mock data for charts
const generateLineData = (count: number, base: number, variation: number) => {
  return Array.from({ length: count }, (_, i) =>
    Math.max(
      0,
      base + Math.sin(i * 0.5) * variation + (Math.random() - 0.5) * 20,
    ),
  );
};

const generateBarData = (count: number, max: number) => {
  return Array.from(
    { length: count },
    () => Math.floor(Math.random() * max) + 50,
  );
};

const rangeMockData: Record<
  "7d" | "30d" | "90d",
  {
    userGrowth: number[];
    contentCreation: number[];
    messageActivity: number[];
    hospitalEngagement: number[];
    platformMetrics: {
      uptime: number;
      responseTime: number;
      errorRate: number;
      satisfaction: number;
    };
    topHospitals: Array<{ name: string; users: number; growth: number }>;
  }
> = {
  "7d": {
    userGrowth: generateLineData(7, 100, 30),
    contentCreation: generateLineData(7, 50, 20),
    messageActivity: generateLineData(7, 200, 80),
    hospitalEngagement: generateBarData(5, 150),
    platformMetrics: {
      uptime: 99.8,
      responseTime: 124,
      errorRate: 0.2,
      satisfaction: 4.7,
    },
    topHospitals: [
      { name: "General Hospital", users: 245, growth: 12 },
      { name: "City Medical", users: 189, growth: 8 },
      { name: "Community Health", users: 156, growth: -2 },
      { name: "Regional Center", users: 134, growth: 15 },
      { name: "University Hospital", users: 98, growth: 5 },
    ],
  },
  "30d": {
    userGrowth: generateLineData(4, 130, 40),
    contentCreation: generateLineData(4, 70, 25),
    messageActivity: generateLineData(4, 260, 95),
    hospitalEngagement: generateBarData(5, 200),
    platformMetrics: {
      uptime: 99.5,
      responseTime: 138,
      errorRate: 0.35,
      satisfaction: 4.5,
    },
    topHospitals: [
      { name: "General Hospital", users: 820, growth: 18 },
      { name: "City Medical", users: 744, growth: 14 },
      { name: "Community Health", users: 692, growth: 9 },
      { name: "Regional Center", users: 621, growth: 11 },
      { name: "University Hospital", users: 575, growth: 7 },
    ],
  },
  "90d": {
    userGrowth: generateLineData(3, 170, 55),
    contentCreation: generateLineData(3, 95, 30),
    messageActivity: generateLineData(3, 350, 120),
    hospitalEngagement: generateBarData(5, 280),
    platformMetrics: {
      uptime: 99.2,
      responseTime: 151,
      errorRate: 0.48,
      satisfaction: 4.3,
    },
    topHospitals: [
      { name: "General Hospital", users: 2140, growth: 24 },
      { name: "City Medical", users: 2015, growth: 21 },
      { name: "Community Health", users: 1884, growth: 17 },
      { name: "Regional Center", users: 1731, growth: 16 },
      { name: "University Hospital", users: 1650, growth: 14 },
    ],
  },
};

const DashboardPage: React.FC = () => {
  const stats = useAdminStore((state) => state.overview);
  const loading = useAdminStore((state) => state.overviewLoading);
  const overviewLoaded = useAdminStore((state) => state.overviewLoaded);
  const fetchOverview = useAdminStore((state) => state.fetchOverview);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("7d");

  const selectedRangeData = rangeMockData[timeRange];

  useEffect(() => {
    if (!overviewLoaded) {
      fetchOverview();
    }
  }, [overviewLoaded, fetchOverview]);

  const getTimeLabels = () => {
    switch (timeRange) {
      case "7d":
        return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      case "30d":
        return ["Week 1", "Week 2", "Week 3", "Week 4"];
      case "90d":
        return ["Month 1", "Month 2", "Month 3"];
      default:
        return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    }
  };

  const timeLabels = getTimeLabels();

  // Ensure we have valid data for charts
  const hospitalData = selectedRangeData.hospitalEngagement || [
    50, 75, 100, 125, 150,
  ];
  const userGrowthData = selectedRangeData.userGrowth.slice(
    0,
    timeLabels.length,
  );
  const userGrowthDelta =
    userGrowthData.length > 1
      ? ((userGrowthData[userGrowthData.length - 1] - userGrowthData[0]) /
          Math.max(userGrowthData[0], 1)) *
        100
      : 0;
  const contentGrowthData = selectedRangeData.contentCreation.slice(
    0,
    timeLabels.length,
  );
  const messageData = selectedRangeData.messageActivity || [
    150, 180, 200, 220, 250, 230, 210,
  ];
  const scopedMessageData = messageData.slice(0, timeLabels.length);

  const commonLineOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#111827",
        titleColor: "#F9FAFB",
        bodyColor: "#F9FAFB",
        padding: 10,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#6B7280", font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(156, 163, 175, 0.2)" },
        ticks: { color: "#6B7280", font: { size: 11 } },
      },
    },
    elements: {
      point: { radius: 3, hoverRadius: 6 },
      line: { tension: 0.35, borderWidth: 3 },
    },
  };

  const userGrowthChartData = {
    labels: timeLabels,
    datasets: [
      {
        label: "Users",
        data: userGrowthData,
        borderColor: "#2563EB",
        backgroundColor: "rgba(37, 99, 235, 0.18)",
        fill: true,
      },
    ],
  };

  const contentChartData = {
    labels: timeLabels,
    datasets: [
      {
        label: "Content",
        data: contentGrowthData,
        borderColor: "#16A34A",
        backgroundColor: "rgba(22, 163, 74, 0.16)",
        fill: true,
      },
    ],
  };

  const hospitalChartData = {
    labels: selectedRangeData.topHospitals.map(
      (item) => item.name.split(" ")[0],
    ),
    datasets: [
      {
        label: "Active Users",
        data: hospitalData,
        backgroundColor: [
          "rgba(249, 115, 22, 0.88)",
          "rgba(245, 158, 11, 0.88)",
          "rgba(251, 146, 60, 0.88)",
          "rgba(234, 88, 12, 0.88)",
          "rgba(251, 191, 36, 0.88)",
        ],
        borderRadius: 10,
      },
    ],
  };

  const hospitalChartOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#111827",
        titleColor: "#F9FAFB",
        bodyColor: "#F9FAFB",
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#6B7280" } },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(156, 163, 175, 0.2)" },
        ticks: { color: "#6B7280" },
      },
    },
  };

  const performanceRadarData = {
    labels: ["Uptime", "Speed", "Low Errors", "Satisfaction"],
    datasets: [
      {
        label: "Platform Score",
        data: [
          selectedRangeData.platformMetrics.uptime,
          ((300 - selectedRangeData.platformMetrics.responseTime) / 300) * 100,
          100 - selectedRangeData.platformMetrics.errorRate,
          (selectedRangeData.platformMetrics.satisfaction / 5) * 100,
        ],
        borderColor: "#7C3AED",
        backgroundColor: "rgba(124, 58, 237, 0.2)",
        pointBackgroundColor: "#7C3AED",
      },
    ],
  };

  const performanceRadarOptions: ChartOptions<"radar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: { display: false },
        grid: { color: "rgba(156, 163, 175, 0.25)" },
        angleLines: { color: "rgba(156, 163, 175, 0.25)" },
        pointLabels: { color: "#6B7280", font: { size: 11 } },
      },
    },
  };

  const topHospitalsChartData = {
    labels: selectedRangeData.topHospitals.map((item) => item.name),
    datasets: [
      {
        data: selectedRangeData.topHospitals.map((item) => item.users),
        backgroundColor: [
          "#4F46E5",
          "#06B6D4",
          "#10B981",
          "#F59E0B",
          "#EF4444",
        ],
        borderWidth: 0,
      },
    ],
  };

  const topHospitalsChartOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { color: "#6B7280", boxWidth: 12 },
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.label}: ${context.parsed} users`,
        },
      },
    },
    cutout: "62%",
  };

  const messageChartData = {
    labels: timeLabels,
    datasets: [
      {
        label: "Messages",
        data: scopedMessageData,
        borderColor: "#06B6D4",
        backgroundColor: "rgba(6, 182, 212, 0.16)",
        fill: true,
      },
    ],
  };

  if (loading) {
    return (
      <Layout>
        <DashboardPageSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Welcome to BellyTalk Admin Panel
            </p>
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
              <span className="text-sm text-blue-100">
                +12.5% from last period
              </span>
            </div>
          </div>

          <div className="bg-linear-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">
                  Content Pieces
                </p>
                <p className="text-3xl font-bold mt-2">
                  {stats?.contents || 0}
                </p>
              </div>
              <FileText className="w-8 h-8 text-green-200" />
            </div>
            <div className="flex items-center gap-1 mt-4">
              <ArrowUp className="w-4 h-4" />
              <span className="text-sm text-green-100">
                +8.3% from last period
              </span>
            </div>
          </div>

          <div className="bg-linear-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Messages</p>
                <p className="text-3xl font-bold mt-2">
                  {stats?.messages || 0}
                </p>
              </div>
              <MessageSquare className="w-8 h-8 text-purple-200" />
            </div>
            <div className="flex items-center gap-1 mt-4">
              <ArrowUp className="w-4 h-4" />
              <span className="text-sm text-purple-100">
                +23.1% from last period
              </span>
            </div>
          </div>

          <div className="bg-linear-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Hospitals</p>
                <p className="text-3xl font-bold mt-2">
                  {stats?.hospitals || 0}
                </p>
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  User Growth
                </h3>
              </div>
              <span
                className={`text-sm font-medium ${userGrowthDelta >= 0 ? "text-green-500" : "text-red-500"}`}
              >
                {userGrowthDelta >= 0 ? "+" : ""}
                {userGrowthDelta.toFixed(1)}%
              </span>
            </div>
            <div className="h-56">
              <Line data={userGrowthChartData} options={commonLineOptions} />
            </div>
          </div>

          {/* Content Creation Line Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-green-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Content Creation
                </h3>
              </div>
              <span className="text-sm text-green-500 font-medium">+8.3%</span>
            </div>
            <div className="h-56">
              <Line
                data={contentChartData}
                options={{
                  ...commonLineOptions,
                  elements: {
                    ...commonLineOptions.elements,
                    line: { tension: 0.35, borderWidth: 3 },
                  },
                }}
              />
            </div>
          </div>
        </div>

        {/* Performance Metrics & Hospital Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Performance Indicators */}
          <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="w-6 h-6 text-purple-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Performance
              </h3>
            </div>
            <div className="h-56">
              <Radar
                data={performanceRadarData}
                options={performanceRadarOptions}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-400">
              <p>
                Uptime:{" "}
                <span className="font-semibold text-green-500">
                  {selectedRangeData.platformMetrics.uptime}%
                </span>
              </p>
              <p>
                Response:{" "}
                <span className="font-semibold text-blue-500">
                  {selectedRangeData.platformMetrics.responseTime}ms
                </span>
              </p>
              <p>
                Error:{" "}
                <span className="font-semibold text-red-500">
                  {selectedRangeData.platformMetrics.errorRate}%
                </span>
              </p>
              <p>
                Satisfaction:{" "}
                <span className="font-semibold text-yellow-500">
                  {selectedRangeData.platformMetrics.satisfaction}/5
                </span>
              </p>
            </div>
          </div>

          {/* Hospital Comparison Bar Chart - FIXED */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-orange-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Hospital Engagement
                </h3>
              </div>
              <span className="text-sm text-gray-500">Active Users</span>
            </div>
            <div className="h-64">
              <Bar data={hospitalChartData} options={hospitalChartOptions} />
            </div>
          </div>
        </div>

        {/* Top Hospitals & Message Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Hospitals Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <PieChart className="w-6 h-6 text-indigo-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Top Hospitals
              </h3>
            </div>
            <div className="h-64">
              <Doughnut
                data={topHospitalsChartData}
                options={topHospitalsChartOptions}
              />
            </div>
          </div>

          {/* Message Activity Chart - FIXED */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-cyan-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Message Activity
                </h3>
              </div>
              <span className="text-sm text-green-500 font-medium">+23.1%</span>
            </div>
            <div className="h-56">
              <Line data={messageChartData} options={commonLineOptions} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;
