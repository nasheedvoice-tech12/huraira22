import React, { useState, useMemo } from 'react';
import {
  Users,
  TrendingUp,
  Activity,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Download,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Smartphone,
  Monitor,
  Globe,
  Radio,
  Clock,
  Zap,
  Percent,
  X,
  Eye,
  RefreshCw,
  Cpu,
  AlertCircle,
  FileText,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { SystemActivityEvent } from '../lib/analyticsEngine';

export interface AdminAnalyticsViewProps {
  users: Array<{
    userId: string;
    email?: string;
    displayName?: string;
    subscriptionTier: string;
    subscriptionStatus: string;
    availableCredits: number;
    includedCredits: number;
    purchasedCredits: number;
    usedCredits: number;
    updatedAt: string;
    createdAt?: string;
    lastActiveAt?: string;
    isSuspended: boolean;
    platform?: string;
    browser?: string;
    deviceInfo?: any;
  }>;
  sales?: Array<{
    id: string;
    grandTotal: number;
    createdAt: string;
    status: string;
    paymentMethod?: string;
    customerName?: string;
  }>;
  activities?: SystemActivityEvent[];
  referralPromoters?: any[];
  referralPayouts?: any[];
  referralLeads?: any[];
  telemetry?: any;
  onInspectUser?: (userId: string) => void;
}

type TimeframeOption = 'today' | '7d' | '30d' | '90d' | 'ytd' | 'all' | 'custom';

export const AdminAnalyticsView: React.FC<AdminAnalyticsViewProps> = ({
  users = [],
  sales = [],
  activities = [],
  referralPromoters = [],
  referralPayouts = [],
  referralLeads = [],
  telemetry,
  onInspectUser,
}) => {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('30d');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [activitySearch, setActivitySearch] = useState<string>('');
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('ALL');

  const [drillDownModal, setDrillDownModal] = useState<{
    isOpen: boolean;
    title: string;
    type: 'USERS' | 'SALES' | 'ACTIVITIES' | 'ERRORS';
    data: any[];
  }>({
    isOpen: false,
    title: '',
    type: 'USERS',
    data: [],
  });

  const { currentRange, previousRange } = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let prevStart = new Date();
    let prevEnd = new Date();

    switch (timeframe) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case '7d':
        start.setDate(now.getDate() - 7);
        break;
      case '30d':
        start.setDate(now.getDate() - 30);
        break;
      case '90d':
        start.setDate(now.getDate() - 90);
        break;
      case 'ytd':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all':
        start = new Date(2024, 0, 1);
        break;
      case 'custom':
        if (customStart) start = new Date(customStart);
        else start.setDate(now.getDate() - 30);
        break;
    }

    const duration = now.getTime() - start.getTime();
    prevEnd = new Date(start.getTime() - 1);
    prevStart = new Date(start.getTime() - duration);

    return {
      currentRange: { start, end: now },
      previousRange: { start: prevStart, end: prevEnd },
    };
  }, [timeframe, customStart, customEnd]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const date = new Date(u.createdAt || u.updatedAt);
      return date >= currentRange.start && date <= currentRange.end;
    });
  }, [users, currentRange]);

  const prevUsers = useMemo(() => {
    return users.filter((u) => {
      const date = new Date(u.createdAt || u.updatedAt);
      return date >= previousRange.start && date <= previousRange.end;
    });
  }, [users, previousRange]);

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const date = new Date(s.createdAt);
      return date >= currentRange.start && date <= currentRange.end;
    });
  }, [sales, currentRange]);

  const prevSales = useMemo(() => {
    return sales.filter((s) => {
      const date = new Date(s.createdAt);
      return date >= previousRange.start && date <= previousRange.end;
    });
  }, [sales, previousRange]);

  const filteredActivities = useMemo(() => {
    return activities.filter((a) => {
      const date = new Date(a.timestamp);
      const inTime = date >= currentRange.start && date <= currentRange.end;
      const matchesSearch =
        !activitySearch ||
        a.action?.toLowerCase().includes(activitySearch.toLowerCase()) ||
        a.details?.toLowerCase().includes(activitySearch.toLowerCase()) ||
        a.userEmail?.toLowerCase().includes(activitySearch.toLowerCase()) ||
        a.userId?.toLowerCase().includes(activitySearch.toLowerCase());
      const matchesType = activityTypeFilter === 'ALL' || a.type === activityTypeFilter;
      return inTime && matchesSearch && matchesType;
    });
  }, [activities, currentRange, activitySearch, activityTypeFilter]);

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);

  const onlineUsers = useMemo(() => {
    return users.filter((u) => {
      const lastActive = new Date(u.lastActiveAt || u.updatedAt);
      return lastActive >= fiveMinAgo;
    });
  }, [users, fiveMinAgo]);

  const dauUsers = useMemo(() => users.filter((u) => new Date(u.lastActiveAt || u.updatedAt) >= dayAgo), [users, dayAgo]);
  const wauUsers = useMemo(() => users.filter((u) => new Date(u.lastActiveAt || u.updatedAt) >= weekAgo), [users, weekAgo]);
  const mauUsers = useMemo(() => users.filter((u) => new Date(u.lastActiveAt || u.updatedAt) >= monthAgo), [users, monthAgo]);

  const totalUsersCount = users.length;
  const newUsersCount = filteredUsers.length;
  const prevNewUsersCount = prevUsers.length;
  const userGrowthDelta = prevNewUsersCount > 0 ? Math.round(((newUsersCount - prevNewUsersCount) / prevNewUsersCount) * 100) : 100;

  const totalRevenue = filteredSales.reduce((acc, s) => acc + (s.grandTotal || 0), 0);
  const prevRevenue = prevSales.reduce((acc, s) => acc + (s.grandTotal || 0), 0);
  const revenueDelta = prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : 100;

  const totalTransactionsCount = filteredSales.length;
  const completedSales = filteredSales.filter((s) => s.status !== 'cancelled');
  const avgOrderValue = totalTransactionsCount > 0 ? totalRevenue / totalTransactionsCount : 0;

  const returningUsersCount = users.filter((u) => {
    const created = new Date(u.createdAt || u.updatedAt);
    const lastActive = new Date(u.lastActiveAt || u.updatedAt);
    return lastActive.getTime() - created.getTime() > 24 * 60 * 60 * 1000;
  }).length;
  const returningUsersRatio = totalUsersCount > 0 ? Math.round((returningUsersCount / totalUsersCount) * 100) : 0;

  const churnedUsersCount = users.filter((u) => {
    const lastActive = new Date(u.lastActiveAt || u.updatedAt);
    return lastActive < monthAgo;
  }).length;
  const churnRate = totalUsersCount > 0 ? Math.round((churnedUsersCount / totalUsersCount) * 100) : 0;

  const errorEvents = useMemo(() => {
    return activities.filter((a) => a.type === 'SYSTEM_ERROR');
  }, [activities]);
  const errorRate = activities.length > 0 ? ((errorEvents.length / activities.length) * 100).toFixed(2) : '0.00';

  const featureUsageStats = useMemo(() => {
    const counts: Record<string, number> = {
      pos_billing: 0,
      inventory: 0,
      second_brain_ai: 0,
      customers: 0,
      financial_reports: 0,
      online_store: 0,
      referrals: 0,
    };

    activities.forEach((a) => {
      if (a.feature && counts[a.feature] !== undefined) {
        counts[a.feature]++;
      } else if (a.action) {
        if (a.action.includes('POS')) counts.pos_billing++;
        else if (a.action.includes('INVENTORY')) counts.inventory++;
        else if (a.action.includes('AI') || a.action.includes('BRAIN')) counts.second_brain_ai++;
        else if (a.action.includes('CUSTOMER')) counts.customers++;
        else if (a.action.includes('REPORT') || a.action.includes('FINANCE')) counts.financial_reports++;
        else if (a.action.includes('STORE')) counts.online_store++;
        else if (a.action.includes('REFERRAL') || a.action.includes('PROMOTER')) counts.referrals++;
      }
    });

    const maxVal = Math.max(1, ...Object.values(counts));
    return Object.entries(counts).map(([key, count]) => ({
      key,
      name:
        key === 'pos_billing'
          ? 'POS Billing Register'
          : key === 'second_brain_ai'
          ? 'Autonomous AI Brain & Chat'
          : key === 'inventory'
          ? 'Inventory & Stock Operations'
          : key === 'customers'
          ? 'Customer Loyalty & Passes'
          : key === 'financial_reports'
          ? 'Financial P&L & Tax Reports'
          : key === 'online_store'
          ? 'Online Store Beta Portal'
          : 'Referral & Partner Network',
      count,
      percentage: Math.round((count / maxVal) * 100),
    }));
  }, [activities]);

  const funnelData = useMemo(() => {
    const step1 = totalUsersCount;
    const step2 = users.filter((u) => u.usedCredits > 0 || (u as any).lastActiveBusinessId).length;
    const step3 = sales.length > 0 ? Math.min(step2, Math.max(1, sales.length)) : 0;
    const step4 = users.filter((u) => u.subscriptionTier !== 'FREE').length;

    return [
      { step: '1. Account Registered', count: step1, rate: 100 },
      { step: '2. Store / Register Setup', count: step2, rate: step1 > 0 ? Math.round((step2 / step1) * 100) : 0 },
      { step: '3. First Sale Recorded', count: step3, rate: step1 > 0 ? Math.round((step3 / step1) * 100) : 0 },
      { step: '4. Subscribed to Paid Plan', count: step4, rate: step1 > 0 ? Math.round((step4 / step1) * 100) : 0 },
    ];
  }, [totalUsersCount, users, sales]);

  const deviceStats = useMemo(() => {
    let desktop = 0;
    let mobile = 0;
    let tablet = 0;
    let totalDevices = 0;
    const osCounts: Record<string, number> = {};
    const browserCounts: Record<string, number> = {};

    // Ingest real user device telemetry
    users.forEach((u) => {
      const platform = u.platform || u.deviceInfo?.platform;
      const browser = u.browser || u.deviceInfo?.browser;

      if (platform) {
        totalDevices++;
        if (/Mobile|Android|iPhone/i.test(platform)) mobile++;
        else if (/iPad|Tablet/i.test(platform)) tablet++;
        else desktop++;
        osCounts[platform] = (osCounts[platform] || 0) + 1;
      }
      if (browser) {
        browserCounts[browser] = (browserCounts[browser] || 0) + 1;
      }
    });

    // Ingest real system activity event telemetry if available
    activities.forEach((a) => {
      const platform = a.deviceInfo?.platform;
      const browser = a.deviceInfo?.browser;
      if (platform && !osCounts[platform]) {
        osCounts[platform] = (osCounts[platform] || 0) + 1;
        totalDevices++;
        if (/Mobile|Android|iPhone/i.test(platform)) mobile++;
        else if (/iPad|Tablet/i.test(platform)) tablet++;
        else desktop++;
      }
      if (browser && !browserCounts[browser]) {
        browserCounts[browser] = (browserCounts[browser] || 0) + 1;
      }
    });

    const total = Math.max(1, totalDevices);
    return {
      hasData: totalDevices > 0,
      desktopPct: totalDevices > 0 ? Math.round((desktop / total) * 100) : 0,
      mobilePct: totalDevices > 0 ? Math.round((mobile / total) * 100) : 0,
      tabletPct: totalDevices > 0 ? Math.round((tablet / total) * 100) : 0,
      osList: Object.entries(osCounts).sort((a, b) => b[1] - a[1]).slice(0, 4),
      browserList: Object.entries(browserCounts).sort((a, b) => b[1] - a[1]).slice(0, 4),
    };
  }, [users, activities]);

  const chartPoints = useMemo(() => {
    const days = 7;
    const points: Array<{ label: string; usersCount: number; salesTotal: number }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;

      const dayUsers = users.filter((u) => {
        const t = new Date(u.createdAt || u.updatedAt).getTime();
        return t >= dayStart && t < dayEnd;
      }).length;

      const daySales = sales
        .filter((s) => {
          const t = new Date(s.createdAt).getTime();
          return t >= dayStart && t < dayEnd;
        })
        .reduce((sum, s) => sum + (s.grandTotal || 0), 0);

      points.push({
        label: dateStr,
        usersCount: dayUsers,
        salesTotal: daySales,
      });
    }

    return points;
  }, [users, sales]);

  const handleExportCSV = () => {
    const rows = [
      ['Metric', 'Value', 'Context'],
      ['Total Users', totalUsersCount.toString(), 'All time registered accounts'],
      ['New Users (Period)', newUsersCount.toString(), timeframe],
      ['Daily Active Users (DAU)', dauUsers.length.toString(), 'Last 24 hours'],
      ['Weekly Active Users (WAU)', wauUsers.length.toString(), 'Last 7 days'],
      ['Monthly Active Users (MAU)', mauUsers.length.toString(), 'Last 30 days'],
      ['Live Online Users', onlineUsers.length.toString(), 'Active in last 5m'],
      ['Gross Platform Revenue', '$' + totalRevenue.toFixed(2), 'Sales transactions'],
      ['Completed Transactions', completedSales.length.toString(), 'Completed sales'],
      ['Avg Order Value', '$' + avgOrderValue.toFixed(2), 'Average ticket'],
      ['Returning User Ratio', returningUsersRatio + '%', 'Retention rate'],
      ['User Churn Rate', churnRate + '%', 'Inactive > 30 days'],
      ['System Error Rate', errorRate + '%', 'Client error logs'],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.map((c) => '"' + c + '"').join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'velcora_admin_analytics_' + new Date().toISOString().slice(0, 10) + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      timeframe,
      kpis: {
        totalUsers: totalUsersCount,
        newUsers: newUsersCount,
        dau: dauUsers.length,
        wau: wauUsers.length,
        mau: mauUsers.length,
        onlineNow: onlineUsers.length,
        grossRevenue: totalRevenue,
        totalTransactions: totalTransactionsCount,
        churnRate,
        returningUsersRatio,
        errorRate,
      },
      featureUsage: featureUsageStats,
      conversionFunnel: funnelData,
      deviceBreakdown: deviceStats,
      recentActivities: activities.slice(0, 50),
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', 'velcora_analytics_telemetry_' + new Date().toISOString().slice(0, 10) + '.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="velcora-admin-analytics-system" className="space-y-6">
      {/* Top Filter & Control Bar */}
      <div className="bg-white dark:bg-[#0F1424] rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-slate-900 dark:text-[#F8FAFC]">Enterprise Analytics & Telemetry</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Real-Time
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real user cohorts, activity heatmaps, conversion funnels, financial volume, and telemetry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-end md:self-auto">
          <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold">
            {(['today', '7d', '30d', '90d', 'ytd', 'all'] as TimeframeOption[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-lg transition capitalize cursor-pointer ${
                  timeframe === tf
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-[#F8FAFC] shadow-2xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {tf === 'today' ? 'Today' : tf === '7d' ? '7D' : tf === '30d' ? '30D' : tf === '90d' ? '90D' : tf === 'ytd' ? 'YTD' : 'All Time'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              title="Export Report as CSV Spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>CSV</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              title="Export Raw Telemetry JSON"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-500" />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. High-Level KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setDrillDownModal({ isOpen: true, title: 'All Registered Accounts', type: 'USERS', data: users })}
          className="p-5 bg-white dark:bg-[#0F1424] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-primary/50 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Registered</span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-[#F8FAFC] mt-2">
            {totalUsersCount.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+{newUsersCount} in {timeframe.toUpperCase()}</span>
          </div>
        </div>

        <div
          onClick={() => setDrillDownModal({ isOpen: true, title: 'Live Online Users (Active in last 5 min)', type: 'USERS', data: onlineUsers })}
          className="p-5 bg-white dark:bg-[#0F1424] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-500/50 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Online Right Now</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-2">
            <span>{onlineUsers.length}</span>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          </div>
          <div className="text-[11px] font-semibold text-slate-400 mt-1">
            DAU: {dauUsers.length} • WAU: {wauUsers.length} • MAU: {mauUsers.length}
          </div>
        </div>

        <div
          onClick={() => setDrillDownModal({ isOpen: true, title: 'Platform Sales & Transactions', type: 'SALES', data: filteredSales })}
          className="p-5 bg-white dark:bg-[#0F1424] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-primary/50 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gross Volume USD</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-[#F8FAFC] mt-2">
            ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>{totalTransactionsCount} Orders (Avg ${avgOrderValue.toFixed(2)})</span>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-[#0F1424] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Retention & Churn</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-[#F8FAFC] mt-2">
            {returningUsersRatio}% <span className="text-xs font-bold text-slate-400">returning</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mt-1">
            <span>Churn Rate: {churnRate}%</span>
            <span className="text-emerald-500 font-bold">Health: Optimal</span>
          </div>
        </div>
      </div>

      {/* 2. User Growth Timeline & Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white dark:bg-[#0F1424] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#F8FAFC]">
                User Growth & Activity Trajectory (Last 7 Days)
              </h3>
              <p className="text-xs text-slate-500">Daily new registrations & transaction momentum</p>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800">
              +{userGrowthDelta}% Velocity
            </span>
          </div>

          <div className="h-48 w-full flex items-end gap-3 pt-6 pb-2 px-2 border-b border-slate-100 dark:border-slate-800/80">
            {chartPoints.map((pt, idx) => {
              const maxPoint = Math.max(1, ...chartPoints.map((p) => p.usersCount + p.salesTotal / 50));
              const heightPct = Math.min(100, Math.max(0, Math.round(((pt.usersCount * 10 + pt.salesTotal / 20) / maxPoint) * 100)));

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <div className="text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition">
                    +{pt.usersCount}u (${pt.salesTotal.toFixed(0)})
                  </div>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[48px] rounded-xl bg-gradient-to-t from-primary to-indigo-400 group-hover:brightness-110 transition shadow-xs cursor-pointer relative"
                    title={`${pt.label}: ${pt.usersCount} new users, $${pt.salesTotal.toFixed(2)} sales`}
                  ></div>
                  <span className="text-[10px] font-extrabold text-slate-500 tracking-tight mt-1 truncate">
                    {pt.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 text-xs font-bold text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                <span>Active User Velocity</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
                <span>Commercial Volume</span>
              </span>
            </div>
            <span>Period Total: {newUsersCount} Users • ${totalRevenue.toFixed(2)}</span>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white dark:bg-[#0F1424] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#F8FAFC]">Conversion Funnel</h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase">User Journey</span>
            </div>

            <div className="space-y-4">
              {funnelData.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300">{item.step}</span>
                    <span className="text-slate-900 dark:text-[#F8FAFC]">
                      {item.count} <span className="text-slate-400 font-normal">({item.rate}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.max(0, item.rate)}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        idx === 0
                          ? 'bg-primary'
                          : idx === 1
                          ? 'bg-indigo-500'
                          : idx === 2
                          ? 'bg-emerald-500'
                          : 'bg-amber-500'
                      }`}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500">
            💡 <strong className="text-slate-900 dark:text-[#F8FAFC]">Insight:</strong> {
              totalUsersCount === 0 
                ? 'Awaiting account registrations to compute user journey conversion velocities.' 
                : funnelData[1].count > 0 
                ? `${funnelData[1].rate}% of registered accounts configured their store & workstations.`
                : 'Users are exploring POS features and account settings.'
            }
          </div>
        </div>
      </div>

      {/* 3. Feature Engagement & Device Intelligence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#0F1424] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#F8FAFC]">
              Feature Usage & Module Engagement
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Telemetry Hits</span>
          </div>

          <div className="space-y-3">
            {featureUsageStats.map((feat) => (
              <div key={feat.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-300">{feat.name}</span>
                  <span className="text-primary">{feat.count} hits</span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.max(0, feat.percentage)}%` }}
                    className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full"
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#0F1424] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#F8FAFC]">
                Device, OS & Browser Distribution
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Platform Telemetry</span>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                <Monitor className="w-5 h-5 mx-auto text-primary mb-1" />
                <div className="text-base font-black text-slate-900 dark:text-[#F8FAFC]">{deviceStats.desktopPct}%</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Desktop</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                <Smartphone className="w-5 h-5 mx-auto text-emerald-500 mb-1" />
                <div className="text-base font-black text-slate-900 dark:text-[#F8FAFC]">{deviceStats.mobilePct}%</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Mobile</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                <Globe className="w-5 h-5 mx-auto text-indigo-500 mb-1" />
                <div className="text-base font-black text-slate-900 dark:text-[#F8FAFC]">{deviceStats.tabletPct}%</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Tablet/Other</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-extrabold text-slate-500 uppercase text-[10px] block mb-2">Top Operating Systems</span>
                <div className="space-y-1.5 font-semibold">
                  {deviceStats.osList.length > 0 ? (
                    deviceStats.osList.map(([os, count]) => (
                      <div key={os} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900">
                        <span className="truncate">{os}</span>
                        <span className="font-bold text-primary">{count}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl">
                      Awaiting client platform logs
                    </div>
                  )}
                </div>
              </div>
              <div>
                <span className="font-extrabold text-slate-500 uppercase text-[10px] block mb-2">Top Browsers</span>
                <div className="space-y-1.5 font-semibold">
                  {deviceStats.browserList.length > 0 ? (
                    deviceStats.browserList.map(([browser, count]) => (
                      <div key={browser} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900">
                        <span className="truncate">{browser}</span>
                        <span className="font-bold text-emerald-600">{count}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl">
                      Awaiting client browser logs
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Live Activity Stream & Error Monitor */}
      <div className="bg-white dark:bg-[#0F1424] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#F8FAFC]">
                Live Real-Time Activity Feed & Health Logs
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">
                {filteredActivities.length} Events Streamed
              </span>
            </div>
            <p className="text-xs text-slate-500">Autonomous event ingestion from all workstations and terminals</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-48 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                placeholder="Filter events..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:outline-hidden"
              />
            </div>

            <select
              value={activityTypeFilter}
              onChange={(e) => setActivityTypeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All Event Types</option>
              <option value="AUTH">Authentication</option>
              <option value="FEATURE_USAGE">Feature Usage</option>
              <option value="TRANSACTION">Transactions</option>
              <option value="REFERRAL">Referrals</option>
              <option value="SYSTEM_ERROR">System Errors</option>
            </select>
          </div>
        </div>

        {filteredActivities.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-bold">
            No live events match current filters. As users interact with Velcora POS, live telemetry logs will stream here.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-80 overflow-y-auto">
            {filteredActivities.slice(0, 30).map((act, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-900/30 px-2 rounded-xl transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-1.5 rounded-lg shrink-0 ${
                      act.type === 'AUTH'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600'
                        : act.type === 'TRANSACTION'
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600'
                        : act.type === 'SYSTEM_ERROR'
                        ? 'bg-red-50 dark:bg-red-950/50 text-red-600'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {act.type === 'AUTH' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : act.type === 'TRANSACTION' ? (
                      <DollarSign className="w-3.5 h-3.5" />
                    ) : act.type === 'SYSTEM_ERROR' ? (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-900 dark:text-[#F8FAFC] truncate">
                      {act.action} {act.details && <span className="font-normal text-slate-500">— {act.details}</span>}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {act.userEmail || act.userId || 'Anonymous'} • {act.deviceInfo?.platform || 'Web Client'} ({act.deviceInfo?.browser || 'Browser'})
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 font-semibold shrink-0 ml-4">
                  {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drill-down Modal */}
      {drillDownModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F1424] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-slate-900 dark:text-[#F8FAFC] text-base">{drillDownModal.title}</h4>
                <p className="text-xs text-slate-500">Inspecting {drillDownModal.data.length} real records</p>
              </div>
              <button
                onClick={() => setDrillDownModal({ isOpen: false, title: '', type: 'USERS', data: [] })}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[60vh] space-y-2 text-xs">
              {drillDownModal.data.map((item: any, idx: number) => (
                <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-slate-900 dark:text-[#F8FAFC]">
                      {item.displayName || item.email || item.id || item.transactionId || `Record #${idx + 1}`}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {item.userId || item.userEmail || item.status || 'Active'} • {item.createdAt || item.updatedAt || item.timestamp || ''}
                    </div>
                  </div>
                  {item.userId && onInspectUser && (
                    <button
                      onClick={() => {
                        setDrillDownModal({ isOpen: false, title: '', type: 'USERS', data: [] });
                        onInspectUser(item.userId);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Profile</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 text-right">
              <button
                onClick={() => setDrillDownModal({ isOpen: false, title: '', type: 'USERS', data: [] })}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
