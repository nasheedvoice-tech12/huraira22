import React, { useState, useMemo } from 'react';
import { useVelcora } from '../context/VelcoraContext';
import {
  DollarSign, ShoppingBag, Users, Eye, ArrowUpRight,
  ChevronDown, ArrowRight, Star, Sparkles, BrainCircuit,
  ShieldCheck, Smartphone, Check, BarChart2, TrendingUp,
  Package, FileText, Layers, Tag, HelpCircle, AlertTriangle
} from 'lucide-react';
import { VelcoraWordmark } from './VelcoraWordmark';
import { LivingLine } from './LivingLine';
import { AiDemandForecaster } from './AiDemandForecaster';
import { SecondBrainExplorer } from './SecondBrainExplorer';
import { useTranslation } from '../context/TranslationContext';

// Fashion Market Intelligence tab removed per user dashboard specification


export const BusinessBrainView: React.FC = () => {
  const {
    activeBusiness,
    brainMetrics,
    currency,
    setCurrentModule,
    products,
    customers,
    salesHistory,
    expenses,
    primaryColor,
    sharedIntelligenceContext,
    setSharedIntelligenceContext,
    recordRecommendationOutcome} = useVelcora();
  const { t, locale, setLocale } = useTranslation();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'forecast' | 'second_brain'>('dashboard');
  const [salesTimeframe, setSalesTimeframe] = useState<'This Week' | 'This Month' | 'This Year'>('This Week');
  const [topProductsTimeframe, setTopProductsTimeframe] = useState<'This Week' | 'This Month' | 'All Time'>('This Week');
  
  // Dynamic 7-day sales points for smooth chart
  const last7DaysData = useMemo(() => {
    const days = [];
    const now = new Date();
    const currencySymbol = currency || '$';

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }); // e.g. "Mon"
      const formattedDate = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }); // "Mon, 13 May"
      
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      
      const daySalesTotal = salesHistory
        ? salesHistory
            .filter(s => {
              if (s.status === 'cancelled') return false;
              const ts = new Date(s.createdAt).getTime();
              return ts >= dayStart && ts < dayEnd;
            })
            .reduce((sum, s) => {
              const val = Number(s.grandTotal);
              return sum + (isNaN(val) ? 0 : val);
            }, 0)
        : 0;

      days.push({
        day: dayName,
        date: formattedDate,
        num: isNaN(daySalesTotal) ? 0 : daySalesTotal,
      });
    }

    const maxValRaw = Math.max(...days.map(d => isNaN(d.num) ? 0 : d.num), 100);
    const maxVal = isNaN(maxValRaw) ? 100 : maxValRaw;

    return days.map((d, idx) => {
      const x = 20 + idx * 70;
      const numVal = isNaN(d.num) ? 0 : d.num;
      const y = 110 - (numVal / (maxVal || 100)) * 90;
      return {
        ...d,
        num: numVal,
        value: `${currencySymbol}${numVal.toLocaleString()}`,
        x: isNaN(x) ? 0 : x,
        y: isNaN(y) ? 110 : y,
      };
    });
  }, [salesHistory, currency]);

  // Initialized with latest day's data or null
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);

  React.useEffect(() => {
    if (last7DaysData.length > 0) {
      setHoveredPoint(last7DaysData[last7DaysData.length - 1]);
    }
  }, [last7DaysData]);

  const [selectedProductDetail, setSelectedProductDetail] = useState<any | null>(null);

  // Area path for smooth chart
  const areaPath = useMemo(() => {
    if (last7DaysData.length === 0) return '';
    let d = `M ${last7DaysData[0].x} 110`;
    last7DaysData.forEach((pt) => {
      d += ` L ${pt.x} ${pt.y}`;
    });
    d += ` L ${last7DaysData[last7DaysData.length - 1].x} 110 Z`;
    return d;
  }, [last7DaysData]);

  // Line path for smooth chart
  const linePath = useMemo(() => {
    if (last7DaysData.length === 0) return '';
    let d = `M ${last7DaysData[0].x} ${last7DaysData[0].y}`;
    for (let i = 1; i < last7DaysData.length; i++) {
      d += ` L ${last7DaysData[i].x} ${last7DaysData[i].y}`;
    }
    return d;
  }, [last7DaysData]);

  // Dynamically compute sales by category
  const salesByCategory = useMemo(() => {
    const categories: Record<string, number> = {};
    let total = 0;
    if (salesHistory && products) {
      salesHistory.forEach(sale => {
        if (sale.status === 'cancelled') return;
        sale.items.forEach(item => {
          const prod = products.find(p => p.id === item.productId);
          const cat = prod?.category || 'General';
          const lineTotal = (item.unitPrice * item.quantity) - (item.discount || 0);
          const safeLineTotal = isNaN(lineTotal) || lineTotal < 0 ? 0 : lineTotal;
          categories[cat] = (categories[cat] || 0) + safeLineTotal;
          total += safeLineTotal;
        });
      });
    }
    return { categories, total: isNaN(total) ? 0 : total };
  }, [salesHistory, products]);

  // Dynamically compute top products sold
  const sortedTopProducts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (salesHistory) {
      salesHistory.forEach(sale => {
        if (sale.status === 'cancelled') return;
        sale.items.forEach(item => {
          counts[item.productId] = (counts[item.productId] || 0) + item.quantity;
        });
      });
    }
    return [...products]
      .map(p => ({
        ...p,
        unitsSold: counts[p.id] || 0
      }))
      .sort((a, b) => b.unitsSold - a.unitsSold || b.stock - a.stock);
  }, [products, salesHistory]);

  // Dynamically compute recent orders
  const recentSales = useMemo(() => {
    if (!salesHistory) return [];
    return [...salesHistory]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4);
  }, [salesHistory]);

  const isFashion = useMemo(() => {
    return ['clothing', 'footwear', 'cosmetics', 'retail', 'fashion'].includes((activeBusiness?.industry || '').toLowerCase());
  }, [activeBusiness]);

  return (
    <div id="velcora-dashboard-view" className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Top View Mode Switcher */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 sm:px-4 py-2 rounded-xl sm:rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'dashboard'
                ? 'bg-primary text-white shadow-sm shadow-primary/25'
                : 'bg-white dark:bg-[#0F1424] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:white border border-slate-200 dark:border-slate-800'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5 shrink-0" />
            <span>Overview Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('forecast')}
            className={`px-3 sm:px-4 py-2 rounded-xl sm:rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'forecast'
                ? 'bg-primary text-white shadow-sm shadow-primary/25'
                : 'bg-white dark:bg-[#0F1424] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:white border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>Demand Forecaster</span>
          </button>
        </div>

        <button
          onClick={() => setCurrentModule('pos')}
          className="px-3 sm:px-4 py-2 rounded-xl sm:rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center gap-1.5 sm:gap-2 transition shadow-md shadow-primary/20 active:scale-95 whitespace-nowrap shrink-0"
        >
          <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
          <span>Launch POS<span className="hidden sm:inline"> Register</span></span>
        </button>
      </div>

      {activeTab === 'forecast' ? (
        <AiDemandForecaster />
      ) : activeTab === 'second_brain' ? (
        <SecondBrainExplorer />
      ) : (
        /* MAIN VELCORA DASHBOARD */
        <div className="w-full space-y-6">
          {/* Executive Overview Header with Living Line */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#111C30] border border-slate-200/90 dark:border-[#1F2E4D] rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                <VelcoraWordmark size="lg" showLivingLine={false} />
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200/50 dark:border-indigo-800/50 truncate max-w-[200px] sm:max-w-none">
                  {activeBusiness.name}
                </span>
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden md:inline">
                  {activeBusiness.industry || 'Retail & Commerce'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Operating pulse & autonomous business intelligence
              </p>
              <div className="pt-1 max-w-full overflow-hidden">
                <LivingLine mode="ambient" width="100%" height={10} className="max-w-[220px]" />
              </div>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-500 shrink-0">
              <div className="px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-bold text-slate-700 dark:text-slate-300">Store Online</span>
              </div>
            </div>
          </div>

          {/* ========================================================
              1. TOP 4 KPI METRIC CARDS (Desktop Proportional)
          ======================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 2xl:gap-5">
            
            {/* Total Sales Card */}
            <div className="bg-white dark:bg-[#0F1424] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800/60 transition-all flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Gross Revenue
                  </span>
                  <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    {currency || '$'} {brainMetrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                  <TrendingUp className="w-3.5 h-3.5 inline" /> Live
                </span>
                <span className="text-slate-400 font-medium">Real-time ledger</span>
              </div>
            </div>

            {/* Orders Card */}
            <div className="bg-white dark:bg-[#0F1424] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-800/60 transition-all flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Completed Orders
                  </span>
                  <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    {brainMetrics.totalTransactions}
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {salesHistory?.filter(s => s.status !== 'cancelled').length || 0} valid
                </span>
                <span className="text-slate-400 font-medium">All channels</span>
              </div>
            </div>

            {/* Customers Card */}
            <div className="bg-white dark:bg-[#0F1424] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:border-amber-300 dark:hover:border-amber-800/60 transition-all flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Registered Customers
                  </span>
                  <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    {customers.length}
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <span className="text-amber-600 dark:text-amber-400 font-bold">
                  {customers.filter(c => (c.loyaltyPoints || 0) > 0).length} with rewards
                </span>
                <span className="text-slate-400 font-medium">Customer database</span>
              </div>
            </div>

            {/* Inventory Items / Catalog Health Card */}
            <div className="bg-white dark:bg-[#0F1424] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:border-pink-300 dark:hover:border-pink-800/60 transition-all flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Inventory Units
                  </span>
                  <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    {products.reduce((sum, p) => sum + (p.stock || 0), 0)}
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-pink-500 text-white flex items-center justify-center shadow-md shadow-pink-500/20 shrink-0">
                  <Package className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <span className="text-pink-600 dark:text-pink-400 font-bold">
                  {products.length} catalog SKU{products.length !== 1 ? 's' : ''}
                </span>
                <span className="text-slate-400 font-medium">
                  {products.filter(p => !p.isService && p.stock <= (p.minStock ?? 5)).length} low stock
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================
              2. DESKTOP 8 / 4 BALANCED GRID COMPOSITION
          ======================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT 8 COLUMNS: Analytics Chart + Live Orders Table */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Sales Overview Area Chart */}
              <div className="bg-white dark:bg-[#0F1424] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Sales & Revenue Velocity
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      Daily transaction flow across the current operating cycle
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <select
                        value={salesTimeframe}
                        onChange={(e) => setSalesTimeframe(e.target.value as any)}
                        className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-xl px-3 py-1.5 pr-7 focus:outline-none cursor-pointer"
                      >
                        <option>This Week</option>
                        <option>This Month</option>
                        <option>This Year</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Area Chart Container */}
                <div className="relative w-full h-64 pt-2 select-none">
                  <svg
                    viewBox="0 0 460 140"
                    className="w-full h-full overflow-visible"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="velcoraSalesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={primaryColor} stopOpacity="0.25" />
                        <stop offset="100%" stopColor={primaryColor} stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Grid lines */}
                    <line x1="0" y1="20" x2="460" y2="20" stroke="#E2E8F0" strokeDasharray="3 3" className="dark:stroke-slate-800" />
                    <line x1="0" y1="50" x2="460" y2="50" stroke="#E2E8F0" strokeDasharray="3 3" className="dark:stroke-slate-800" />
                    <line x1="0" y1="80" x2="460" y2="80" stroke="#E2E8F0" strokeDasharray="3 3" className="dark:stroke-slate-800" />
                    <line x1="0" y1="110" x2="460" y2="110" stroke="#E2E8F0" strokeDasharray="3 3" className="dark:stroke-slate-800" />

                    {/* Area Fill */}
                    {areaPath && (
                      <path
                        d={areaPath}
                        fill="url(#velcoraSalesGrad)"
                      />
                    )}

                    {/* Main Line Stroke */}
                    {linePath && (
                      <path
                        d={linePath}
                        fill="none"
                        stroke={primaryColor}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Interactive Nodes */}
                    {last7DaysData.map((pt, idx) => (
                      <g
                        key={idx}
                        className="cursor-pointer group"
                        onMouseEnter={() => setHoveredPoint(pt)}
                      >
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={hoveredPoint?.day === pt.day ? 6 : 4}
                          fill={primaryColor}
                          stroke="#FFFFFF"
                          strokeWidth={2}
                          className="transition-all"
                        />
                      </g>
                    ))}
                  </svg>

                  {/* Floating Tooltip */}
                  {hoveredPoint && !isNaN(hoveredPoint.x) && !isNaN(hoveredPoint.y) && (
                    <div
                      style={{
                        left: `${Math.min(90, Math.max(10, ((hoveredPoint.x || 0) / 460) * 100))}%`,
                        top: `${Math.min(80, Math.max(15, ((hoveredPoint.y || 0) / 140) * 100 - 20))}%`,
                      }}
                      className="absolute -translate-x-1/2 -translate-y-full bg-slate-900 dark:bg-slate-800 text-white border border-slate-700 rounded-xl px-3 py-1.5 shadow-xl pointer-events-none z-10 text-center animate-in fade-in zoom-in-95 duration-150"
                    >
                      <div className="text-[10px] text-slate-300 font-medium">
                        {hoveredPoint.date}
                      </div>
                      <div className="text-xs font-black text-white">
                        {hoveredPoint.value}
                      </div>
                    </div>
                  )}
                </div>

                {/* X-Axis Labels */}
                <div className="flex justify-between items-center text-xs font-semibold text-slate-400 dark:text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {last7DaysData.map((item, idx) => (
                    <span
                      key={idx}
                      className={hoveredPoint?.day === item.day ? 'text-primary font-bold' : ''}
                    >
                      {item.day}
                    </span>
                  ))}
                </div>

                {/* Summary Mini Bar Under Chart */}
                <div className="grid grid-cols-3 gap-3 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Avg Order Value</span>
                    <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                      {currency || '$'}{brainMetrics.totalTransactions > 0 ? (brainMetrics.totalRevenue / brainMetrics.totalTransactions).toFixed(2) : '0.00'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Total Net Profit</span>
                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                      {currency || '$'}{brainMetrics.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Expenses Recorded</span>
                    <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
                      {currency || '$'}{brainMetrics.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Orders & Ledger Activity */}
              <div className="bg-white dark:bg-[#0F1424] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Recent Sales & Register Activity
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Latest completed customer orders and receipts
                    </p>
                  </div>
                  <button
                    onClick={() => setCurrentModule('sales_orders')}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <span>View All Orders</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {recentSales.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs font-medium">
                      <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      No sales recorded yet. Ring up your first sale at the POS!
                    </div>
                  ) : (
                    recentSales.map((sale) => {
                      const initials = (sale.customerName || 'WC')
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2);

                      const statusColors: Record<string, string> = {
                        completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/50',
                        pending: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200/50',
                        cancelled: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200/50',
                      };

                      return (
                        <div key={sale.id} className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 px-2 rounded-2xl transition">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-black flex items-center justify-center text-xs shrink-0 border border-indigo-100 dark:border-indigo-900/40">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {sale.customerName || t('walk_in')}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>{sale.items.length} item{sale.items.length !== 1 ? 's' : ''}</span>
                                <span>•</span>
                                <span>{new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span>•</span>
                                <span className="uppercase text-[10px] font-semibold">
                                  {sale.payments?.[0]?.method || sale.channel || 'POS'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className="text-sm font-black text-slate-900 dark:text-white block">
                                {currency || '$'}{sale.grandTotal.toFixed(2)}
                              </span>
                            </div>
                            <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full capitalize border ${statusColors[sale.status] || statusColors.completed}`}>
                              {sale.status}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

            {/* RIGHT 4 COLUMNS: Top Moving Products + Categories */}
            <div className="lg:col-span-4 space-y-6">
              {/* Top Selling Products Leaderboard */}
              <div className="bg-white dark:bg-[#0F1424] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Top Moving Products
                  </h4>
                  <div className="relative">
                    <select
                      value={topProductsTimeframe}
                      onChange={(e) => setTopProductsTimeframe(e.target.value as any)}
                      className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 rounded-xl px-2.5 py-1 pr-6 focus:outline-none cursor-pointer"
                    >
                      <option>This Week</option>
                      <option>This Month</option>
                      <option>All Time</option>
                    </select>
                    <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2.5">
                  {sortedTopProducts.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs font-medium">
                      No products yet in inventory
                    </div>
                  ) : (
                    sortedTopProducts.slice(0, 4).map((p, idx) => {
                      const colors = [
                        'bg-primary/10 text-primary',
                        'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                        'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                        'bg-pink-500/10 text-pink-600 dark:text-pink-400'
                      ];
                      const colorClass = colors[idx % colors.length];
                      const emojis = ['🧥', '🍶', '🧢', '👜'];
                      const emoji = emojis[idx % emojis.length];

                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedProductDetail(p)}
                          className="flex items-center justify-between gap-2.5 p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-9 h-9 rounded-xl ${colorClass} flex items-center justify-center text-base shrink-0 font-bold`}>
                              {p.category?.toLowerCase().includes('hoodie') ? '🧥' : p.category?.toLowerCase().includes('bottle') ? '🍶' : p.category?.toLowerCase().includes('cap') ? '🧢' : emoji}
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {p.name}
                              </h5>
                              <span className="text-[10px] text-slate-400">
                                {p.stock} units in stock
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white shrink-0">
                            {p.unitsSold} sold
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Category Breakdown Donut */}
              <div className="bg-white dark:bg-[#0F1424] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Sales by Category
                  </h4>
                  <span className="text-[11px] text-slate-400 font-semibold">Distribution</span>
                </div>

                <div className="flex items-center justify-center gap-4 py-1">
                  {salesByCategory.total === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs font-medium">
                      No category distribution data yet
                    </div>
                  ) : (
                    <>
                      {/* SVG Donut Chart */}
                      <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                          <circle cx="50" cy="50" r="38" fill="none" stroke="#E2E8F0" strokeWidth="12" className="dark:stroke-slate-800" />
                          {(() => {
                            const cats = Object.entries(salesByCategory.categories);
                            let currentOffset = 0;
                            return cats.map(([name, val], idx) => {
                              const pctRaw = salesByCategory.total > 0 ? (val as number) / salesByCategory.total : 0;
                              const pct = isNaN(pctRaw) ? 0 : pctRaw;
                              const dashArray = `${pct * 238.7} 238.7`;
                              const offset = currentOffset * -238.7;
                              currentOffset += pct;

                              const colors = [primaryColor, '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];
                              const strokeColor = colors[idx % colors.length];

                              return (
                                <circle
                                  key={name}
                                  cx="50"
                                  cy="50"
                                  r="38"
                                  fill="none"
                                  stroke={strokeColor}
                                  strokeWidth="12"
                                  strokeDasharray={dashArray}
                                  strokeDashoffset={isNaN(offset) ? 0 : offset}
                                />
                              );
                            });
                          })()}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-1">
                          <span className="text-[11px] font-black text-slate-900 dark:text-white">
                            {currency || '$'}{(salesByCategory.total || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Total</span>
                        </div>
                      </div>

                      {/* Donut Legend */}
                      <div className="space-y-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                        {Object.entries(salesByCategory.categories).slice(0, 3).map(([name, val], idx) => {
                          const pctRaw = salesByCategory.total > 0 ? ((val as number) / salesByCategory.total) * 100 : 0;
                          const pct = (isNaN(pctRaw) ? 0 : pctRaw).toFixed(0);
                          const colors = [primaryColor, '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];
                          const color = colors[idx % colors.length];

                          return (
                            <div key={name} className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                              <span className="w-16 truncate capitalize text-[11px]">{name}</span>
                              <span className="text-slate-400 text-[11px] font-semibold">{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* Product Detail Modal when clicking on Top Products */}
      {selectedProductDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#0F1424] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                Product Details
              </span>
              <button
                onClick={() => setSelectedProductDetail(null)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-center py-2">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-primary/10 text-4xl flex items-center justify-center mb-2">
                {selectedProductDetail.name.includes('Hoodie') ? '🧥' : selectedProductDetail.name.includes('Bottle') ? '🍶' : selectedProductDetail.name.includes('Cap') ? '🧢' : '👜'}
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                {selectedProductDetail.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {selectedProductDetail.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-500 font-bold">Selling Price</span>
                <div className="text-base font-black text-slate-900 dark:text-white">
                  {currency || '$'}{selectedProductDetail.sellingPrice?.toFixed(2) || (selectedProductDetail.price || 0).toFixed(2)}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-500 font-bold">In Stock</span>
                <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  {selectedProductDetail.stock || 0} units
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => {
                  setSelectedProductDetail(null);
                  setCurrentModule('pos');
                }}
                className="flex-1 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition shadow-md"
              >
                Ring Up on POS
              </button>
              <button
                onClick={() => {
                  setSelectedProductDetail(null);
                  setCurrentModule('products');
                }}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 transition"
              >
                Catalog View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
