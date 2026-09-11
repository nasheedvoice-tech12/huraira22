import React, { useState, useMemo } from 'react';
import { useVelcora } from '../context/VelcoraContext';
import { PaymentRecord } from '../types';
import { DEFAULT_SUBSCRIPTION_PLANS, DEFAULT_TOKEN_PACKAGES } from '../data/paymentPlans';
import { useTranslation } from '../context/TranslationContext';
import {
  CreditCard, Banknote, Smartphone,
  Search, ArrowDownRight, RefreshCw, Printer,
  Eye, CheckCircle2, AlertCircle, XCircle, Sparkles, Zap, Wallet,
  Check, ShieldCheck, ArrowRight, Layers, DollarSign,
  Cpu, Bot, Activity, Flame, Award, TrendingUp, Lock, CheckCircle
} from 'lucide-react';

export const PaymentRecordsView: React.FC = () => {
  const {
    paymentsList,
    sales,
    customerCredits,
    activeBusiness,
    currency,
    openCheckoutModal,
    activeSubscription,
    tokenPackages,
    subscriptionPlans,
    activeUser,
    paymentsActiveTab,
    setPaymentsActiveTab,
  } = useVelcora();
  const { t } = useTranslation();

  // Top-level View Mode
  const activeTab = paymentsActiveTab;
  const setActiveTab = setPaymentsActiveTab;

  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [planBillingInterval, setPlanBillingInterval] = useState<'monthly' | 'annual'>('monthly');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;

  const currencySymbol = activeBusiness.currencySymbol || '$';

  const availablePlans = (subscriptionPlans && subscriptionPlans.length > 0) ? subscriptionPlans : DEFAULT_SUBSCRIPTION_PLANS;
  const availablePackages = (tokenPackages && tokenPackages.length > 0) ? tokenPackages : DEFAULT_TOKEN_PACKAGES;

  // Aggregate all real customer payment records across POS sales, credit settlements, and direct ledger entries
  const allPayments = useMemo<PaymentRecord[]>(() => {
    const recordsMap = new Map<string, PaymentRecord>();

    // 1. Existing direct payments
    (paymentsList || []).forEach(p => {
      recordsMap.set(p.id, p);
    });

    // 2. Real sales payments
    (sales || []).forEach(s => {
      if (s.payments && Array.isArray(s.payments) && s.payments.length > 0) {
        s.payments.forEach((p, idx) => {
          const recId = (p as any).id || `pay-sale-${s.id}-${idx}`;
          if (!recordsMap.has(recId)) {
            recordsMap.set(recId, {
              id: recId,
              businessId: s.businessId,
              orderId: s.id,
              orderNumber: s.invoiceNumber,
              customerName: s.customerName || 'Walk-in Customer',
              amount: p.amount,
              method: p.method,
              status: s.status === 'cancelled' ? 'refunded' : (s.status === 'completed' ? 'completed' : 'pending'),
              referenceNumber: p.reference || s.invoiceNumber,
              notes: s.notes || undefined,
              cashierName: s.cashierName || 'POS Register',
              createdAt: s.createdAt,
            });
          }
        });
      } else if (s.status === 'completed' && s.grandTotal > 0) {
        const recId = `pay-sale-${s.id}-direct`;
        if (!recordsMap.has(recId)) {
          recordsMap.set(recId, {
            id: recId,
            businessId: s.businessId,
            orderId: s.id,
            orderNumber: s.invoiceNumber,
            customerName: s.customerName || 'Walk-in Customer',
            amount: s.grandTotal,
            method: 'cash',
            status: 'completed',
            referenceNumber: s.invoiceNumber,
            notes: s.notes || undefined,
            cashierName: s.cashierName || 'POS Register',
            createdAt: s.createdAt,
          });
        }
      }
    });

    // 3. Real Customer Credit settlements
    (customerCredits || []).forEach(cc => {
      (cc.payments || []).forEach(p => {
        const recId = `pay-credit-${p.id}`;
        if (!recordsMap.has(recId)) {
          recordsMap.set(recId, {
            id: recId,
            businessId: cc.businessId,
            orderId: cc.id,
            orderNumber: cc.invoiceId || 'CREDIT-SETTLE',
            customerName: cc.customerName,
            amount: p.amount,
            method: (p.method || 'cash') as any,
            status: 'completed',
            referenceNumber: cc.invoiceId || `REF-${p.id}`,
            notes: 'Customer credit payment settlement',
            cashierName: 'Accounts Receivable',
            createdAt: p.date || new Date().toISOString(),
          });
        }
      });
    });

    return Array.from(recordsMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [paymentsList, sales, customerCredits]);

  // Metrics dynamically derived from real transactions
  const totalCollected = allPayments
    .filter(p => p.status === 'completed')
    .reduce((acc, p) => acc + p.amount, 0);

  const cashVolume = allPayments
    .filter(p => p.method === 'cash' && p.status === 'completed')
    .reduce((acc, p) => acc + p.amount, 0);

  const cardVolume = allPayments
    .filter(p => p.method === 'card' && p.status === 'completed')
    .reduce((acc, p) => acc + p.amount, 0);

  const digitalVolume = allPayments
    .filter(p => (p.method === 'mobile_wallet' || p.method === 'bank_transfer') && p.status === 'completed')
    .reduce((acc, p) => acc + p.amount, 0);

  const filteredPayments = allPayments.filter(p => {
    const matchesSearch =
      (p.orderNumber && p.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.customerName && p.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.referenceNumber && p.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;
    if (methodFilter !== 'all' && p.method !== methodFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;

    // Date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      if (new Date(p.createdAt) < fromDate) return false;
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (new Date(p.createdAt) > toDate) return false;
    }

    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  const paginatedPayments = filteredPayments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <Banknote className="w-4 h-4 text-emerald-500" />;
      case 'card':
        return <CreditCard className="w-4 h-4 text-primary" />;
      case 'mobile_wallet':
        return <Smartphone className="w-4 h-4 text-blue-500" />;
      case 'bank_transfer':
        return <ArrowDownRight className="w-4 h-4 text-indigo-500" />;
      default:
        return <CreditCard className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-3 h-3" />
            Pending
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <RefreshCw className="w-3 h-3" />
            Refunded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <XCircle className="w-3 h-3" />
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with 3 Tab Switcher */}
      <div className="velcora-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-primary-light text-primary flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Billing, Wallet & Payments</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
              Real-Time Sync
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Centralized hub for store sales settlements, AI token allowances, and Velcora subscription tiers.
          </p>
        </div>

        {/* 3 Main Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80">
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ledger'
                ? 'bg-white dark:bg-[#111C30] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Banknote className="w-3.5 h-3.5" />
            <span>POS Ledger</span>
          </button>

          <button
            onClick={() => setActiveTab('wallet')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'wallet'
                ? 'bg-white dark:bg-[#111C30] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>AI Wallet</span>
          </button>

          <button
            onClick={() => setActiveTab('plans')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'plans'
                ? 'bg-white dark:bg-[#111C30] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Plans</span>
          </button>
        </div>
      </div>

      {/* TAB 1: POS LEDGER */}
      {activeTab === 'ledger' && (
        <div className="space-y-6">
          {/* Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="velcora-card p-4">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-2">
                <span>TOTAL COLLECTED</span>
                <CheckCircle2 className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-primary">
                {currencySymbol}{totalCollected.toFixed(2)}
              </div>
              <div className="text-xs text-slate-500 mt-1">{allPayments.length} total payments processed</div>
            </div>

            <div className="velcora-card p-4">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-2">
                <span>CARD & EMV VOLUME</span>
                <CreditCard className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {currencySymbol}{cardVolume.toFixed(2)}
              </div>
              <div className="text-xs text-primary/80 mt-1">
                {totalCollected > 0 ? ((cardVolume / totalCollected) * 100).toFixed(0) : 0}% of revenue
              </div>
            </div>

            <div className="velcora-card p-4">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-2">
                <span>CASH IN DRAWER</span>
                <Banknote className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {currencySymbol}{cashVolume.toFixed(2)}
              </div>
              <div className="text-xs text-emerald-600/80 mt-1">Physical cash collected</div>
            </div>

            <div className="velcora-card p-4">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-2">
                <span>DIGITAL & TRANSFERS</span>
                <Smartphone className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {currencySymbol}{digitalVolume.toFixed(2)}
              </div>
              <div className="text-xs text-blue-600/80 mt-1">Wallet & bank transfers</div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="velcora-card p-3 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by invoice #, customer, reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-ring"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                title="From date"
              />
              <span className="text-xs text-slate-400 font-medium">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                title="To date"
              />

              <select
                value={methodFilter}
                onChange={(e) => { setMethodFilter(e.target.value); setCurrentPage(1); }}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash Only</option>
                <option value="card">Card (Visa/MC)</option>
                <option value="mobile_wallet">{t('wallet')}</option>
                <option value="bank_transfer">{t('bank')}</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="refunded">Refunded</option>
              </select>

              <button
                onClick={() => window.print()}
                className="velcora-btn-secondary flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-xl cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="velcora-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 font-semibold">
                    <th className="py-3 px-4">TRANSACTION / INVOICE</th>
                    <th className="py-3 px-4">CUSTOMER</th>
                    <th className="py-3 px-4">PAYMENT METHOD</th>
                    <th className="py-3 px-4">AMOUNT</th>
                    <th className="py-3 px-4">CASHIER</th>
                    <th className="py-3 px-4">STATUS</th>
                    <th className="py-3 px-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedPayments.map((pay) => (
                    <tr
                      key={pay.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white font-mono">
                          {pay.orderNumber || 'POS-DIRECT'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {pay.referenceNumber || pay.id}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {pay.customerName || t('walk_in')}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(pay.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-medium capitalize text-slate-800 dark:text-slate-200">
                          {getMethodIcon(pay.method)}
                          <span>{pay.method.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          {currencySymbol}{pay.amount.toFixed(2)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">
                        {pay.cashierName || 'Register User'}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(pay.status)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedPayment(pay)}
                          className="p-1.5 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg inline-flex items-center gap-1 font-semibold cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredPayments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300">No payment records found</p>
                        <p className="text-xs text-slate-500">Transactions processed in POS appear here automatically.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="velcora-card p-3 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filteredPayments.length)} of {filteredPayments.length} records
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-primary text-white">
                  {currentPage}
                </span>
                <span className="text-xs text-slate-500">of {totalPages}</span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AI WALLET & TOKENS */}
      {activeTab === 'wallet' && (
        <div className="space-y-6">
          <style>{`
            @keyframes float-wallet { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
            @keyframes shimmer-wallet { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
            @keyframes glow-wallet { 0%, 100% { box-shadow: 0 0 18px rgba(245, 158, 11, 0.25); } 50% { box-shadow: 0 0 42px rgba(245, 158, 11, 0.5); } }
            @keyframes gradient-shift-wallet { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
            .animate-float-wallet { animation: float-wallet 5s ease-in-out infinite; }
            .animate-shimmer-wallet { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent); background-size: 200% 100%; animation: shimmer-wallet 2.2s infinite; }
            .animate-glow-wallet { animation: glow-wallet 3s ease-in-out infinite; }
            .animate-gradient-wallet { background-size: 200% 200%; animation: gradient-shift-wallet 4s ease infinite; }
          `}</style>

          {/* Top Hero: Autonomous Intelligence Wallet Banner */}
          <div className="velcora-card p-6 md:p-8 relative overflow-hidden bg-gradient-to-br from-slate-900 via-[#0E1528] to-[#121A33] border border-indigo-500/20 shadow-2xl">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute bottom-0 left-1/3 -mb-8 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none animate-float-wallet" />
            <div className="absolute top-1/4 left-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-shimmer-wallet pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-7 space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/10 to-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold animate-pulse" style={{ animationDuration: '2.5s' }}>
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>High-Speed AI Compute Allowance</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight bg-gradient-to-r from-white via-indigo-100 to-amber-100 bg-clip-text text-transparent">
                  Autonomous Intelligence Wallet
                </h2>
                
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                  Fuel real-time neural forecasting, automated invoice audits, optical barcode scanning, and natural language business intelligence.
                </p>

                {/* Telemetry Chips - Animated */}
                <div className="flex flex-wrap items-center gap-2.5 pt-2 text-xs">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 transition-all duration-300 hover:border-amber-500/50 hover:scale-105 hover:shadow-lg hover:shadow-amber-500/10">
                    <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" style={{ animationDuration: '2s' }} />
                    <span>Tier: <strong className="text-white capitalize">{activeSubscription?.tier || 'Professional'}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 transition-all duration-300 hover:border-emerald-500/50 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/10">
                    <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" style={{ animationDuration: '2.2s' }} />
                    <span>Status: <strong className="text-emerald-400">Live & Synced</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 transition-all duration-300 hover:border-indigo-500/50 hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/10">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 animate-pulse" style={{ animationDuration: '2.4s' }} />
                    <span>Quota: <strong className="text-white">Never Expires</strong></span>
                  </div>
                </div>
              </div>

              {/* Balance & Top-up Box - Enhanced Animated */}
              <div className="lg:col-span-5 flex flex-col justify-center">
                <div className="p-5 rounded-2xl bg-slate-950/70 border border-amber-500/25 backdrop-blur-md space-y-4 relative overflow-hidden animate-glow-wallet transition-all duration-500 hover:border-amber-500/50 hover:scale-[1.02]">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500/[0.06] via-transparent to-indigo-500/[0.06] animate-shimmer-wallet pointer-events-none" />
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-amber-400" />
                        Available Balance
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" style={{ animationDuration: '1.5s' }} />
                        ACTIVE
                      </span>
                    </div>

                    <div className="space-y-1 mt-3">
                      <div className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-baseline gap-2">
                        <span className="tabular-nums bg-gradient-to-r from-amber-200 via-white to-indigo-200 bg-clip-text text-transparent">{(activeSubscription?.tokensIncludedMonthly || 100000).toLocaleString()}</span>
                        <span className="text-xs font-bold text-amber-400">TOKENS</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden relative">
                        <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-indigo-500 h-full w-4/5 rounded-full transition-all duration-700 animate-gradient-wallet relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer-wallet" />
                        </div>
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 flex justify-between mt-1">
                        <span>0</span>
                        <span className="text-emerald-400 animate-pulse" style={{ animationDuration: '2s' }}>◆ {(activeSubscription?.tokensIncludedMonthly || 100000).toLocaleString()} available now</span>
                      </div>
                    </div>

                    <button
                      onClick={() => openCheckoutModal('tokens')}
                      className="group relative w-full py-3 mt-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 transition-all duration-500 hover:scale-[1.02] cursor-pointer active:scale-98 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer-wallet pointer-events-none" />
                      <Zap className="w-4 h-4 text-slate-950 fill-current transition-transform duration-300 group-hover:rotate-12" />
                      <span>Instant Token Top-Up</span>
                      <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Token Packages Selection Grid */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>On-Demand AI Token Packages</span>
                </h3>
                <p className="text-xs text-slate-500">One-time credit additions with immediate activation and lifetime validity.</p>
              </div>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 px-3 py-1 rounded-full self-start sm:self-auto">
                ⚡ Instant Cloud Delivery
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {availablePackages.map((pkg, idx) => {
                const isPopular = pkg.isPopular || idx === 1;
                const totalTokens = pkg.tokens + (pkg.bonusTokens || 0);

                return (
                  <div
                    key={pkg.id}
                    className={`relative group rounded-3xl p-6 transition-all duration-500 flex flex-col justify-between border overflow-hidden ${
                      isPopular
                        ? 'border-indigo-500/60 bg-gradient-to-b from-indigo-500/10 via-white dark:via-[#111C30] to-white dark:to-[#0B101D] ring-2 ring-indigo-500/30 shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.03] animate-glow-wallet'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1528] hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 hover:scale-[1.02] shadow-sm'
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md animate-pulse" style={{ animationDuration: '3s' }}>
                        ★ MOST POPULAR CHOICE
                      </div>
                    )}

                    <div className="space-y-4 relative">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            PACKAGE {idx + 1}
                          </span>
                          <h4 className="text-lg font-black text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                            {isPopular && <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 animate-pulse" style={{ animationDuration: '2s' }} />}
                            {pkg.name}
                          </h4>
                        </div>
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 ${isPopular ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                          <Zap className="w-5 h-5" />
                        </div>
                      </div>

                      {/* Price Section */}
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{currencySymbol}{pkg.priceUSD}</span>
                          <span className="text-xs text-slate-400 font-medium">one-time</span>
                        </div>
                        <div className="text-sm font-black text-indigo-600 dark:text-indigo-400 mt-1 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 animate-pulse" style={{ animationDuration: '2.5s' }} />
                          <span>{totalTokens.toLocaleString()} Total Tokens</span>
                        </div>
                      </div>

                      {pkg.bonusTokens > 0 ? (
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 transition-all duration-300 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10">
                          <Sparkles className="w-3.5 h-3.5 shrink-0 animate-spin" style={{ animationDuration: '4s' }} />
                          <span>Includes +{pkg.bonusTokens.toLocaleString()} Bonus Tokens</span>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium">
                          Standard Token Pack
                        </div>
                      )}

                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 transition-all duration-200 hover:translate-x-1 hover:text-slate-900 dark:hover:text-white">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>Demand Forecasting & Analytics</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 transition-all duration-200 hover:translate-x-1 hover:text-slate-900 dark:hover:text-white">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>Optical Scanner & Barcode OCR</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 transition-all duration-200 hover:translate-x-1 hover:text-slate-900 dark:hover:text-white">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>Never expires • Instant wallet sync</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6">
                      <button
                        onClick={() => openCheckoutModal('tokens', pkg.id)}
                        className={`relative w-full py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-500 cursor-pointer shadow-md active:scale-98 overflow-hidden ${
                          isPopular
                            ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/40 hover:shadow-indigo-500/60 hover:scale-[1.03]'
                            : 'bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white hover:scale-[1.03]'
                        }`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-wallet pointer-events-none" />
                        <Zap className="w-3.5 h-3.5 text-amber-300 transition-transform duration-300 group-hover:rotate-12" />
                        <span>Select {pkg.name}</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUBSCRIPTION PLANS */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          {/* Header & Interval Switcher */}
          <div className="velcora-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Velcora Store Subscription Tiers</h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Unlock enterprise point-of-sale features, multi-terminal sync, and dedicated intelligence bandwidth.
              </p>
            </div>

            {/* Monthly / Annual Toggle */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 self-start md:self-auto">
              <button
                onClick={() => setPlanBillingInterval('monthly')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  planBillingInterval === 'monthly'
                    ? 'bg-white dark:bg-[#111C30] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setPlanBillingInterval('annual')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  planBillingInterval === 'annual'
                    ? 'bg-white dark:bg-[#111C30] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span>Annual</span>
                <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded-full bg-emerald-500 text-white">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          {/* Plan Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {availablePlans.map((plan, idx) => {
              const isPopular = plan.id === 'tier_pro' || plan.id === 'tier_professional' || idx === 1;
              const isCurrent = activeSubscription?.tier?.toLowerCase() === plan.name.toLowerCase() || (plan.id === 'tier_pro' && !activeSubscription?.tier);
              const price = planBillingInterval === 'annual' 
                ? (plan.annualPriceUSD ? Math.round(plan.annualPriceUSD / 12) : Math.round(plan.monthlyPriceUSD * 0.8))
                : plan.monthlyPriceUSD;

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between border ${
                    isPopular
                      ? 'border-indigo-500/60 bg-gradient-to-b from-indigo-500/10 via-white dark:via-[#111C30] to-white dark:to-[#0B101D] ring-2 ring-indigo-500/30 shadow-2xl shadow-indigo-500/15'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1528] hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white shadow-md">
                      ★ RECOMMENDED TIER
                    </div>
                  )}

                  {isCurrent && (
                    <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      CURRENT PLAN
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {plan.id.replace('tier_', '')}
                      </span>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{plan.name}</h3>
                      <p className="text-xs text-slate-500 mt-1">{plan.tagline}</p>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-slate-900 dark:text-white">{currencySymbol}{price}</span>
                        <span className="text-xs text-slate-400 font-medium">/ month</span>
                      </div>
                      {planBillingInterval === 'annual' && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                          Billed annually (Includes 20% discount)
                        </p>
                      )}
                    </div>

                    <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                      <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300 font-medium">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                        <span><strong>{plan.tokensIncludedMonthly.toLocaleString()}</strong> Monthly AI Tokens</span>
                      </div>

                      <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300 font-medium">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                        <span>Up to <strong>{plan.maxWorkstations}</strong> POS Workstations</span>
                      </div>

                      <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300 font-medium">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                        <span>Up to <strong>{plan.maxSubusers}</strong> Staff & Subusers</span>
                      </div>

                      <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300 font-medium">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                        <span>Multi-currency & offline POS sync</span>
                      </div>

                      <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300 font-medium">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                        <span>Automated Cloud Backups</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      onClick={() => openCheckoutModal('subscriptions', plan.id)}
                      className={`w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg active:scale-98 ${
                        isCurrent
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                          : isPopular
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30'
                          : 'bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isCurrent ? 'Manage Billing Tier' : `Upgrade to ${plan.name}`}</span>
                      {!isCurrent && <ArrowRight className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment Receipt Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="velcora-card w-full max-w-md p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-slate-900 dark:text-white text-base">Payment Receipt</h2>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Printable Receipt Paper Style */}
            <div className="bg-slate-50 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-xs space-y-3">
              <div className="text-center pb-2 border-b border-dashed border-slate-300 dark:border-slate-700">
                <div className="font-bold text-slate-900 dark:text-white text-sm">{activeBusiness.name}</div>
                <div className="text-slate-500 text-[11px]">{activeBusiness.address}</div>
                <div className="text-slate-500 text-[11px]">Tel: {activeBusiness.phone}</div>
              </div>

              <div className="space-y-1 text-slate-700 dark:text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice:</span>
                  <span className="font-bold">{selectedPayment.orderNumber || 'POS-SALE'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Txn Ref:</span>
                  <span>{selectedPayment.referenceNumber || selectedPayment.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span>{selectedPayment.customerName || 'Walk-in'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cashier:</span>
                  <span>{selectedPayment.cashierName || 'Register 1'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date/Time:</span>
                  <span>{new Date(selectedPayment.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="border-t border-b border-dashed border-slate-300 dark:border-slate-700 py-2.5">
                <div className="flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white">
                  <span>TOTAL PAID ({(selectedPayment?.method || '').toUpperCase()}):</span>
                  <span className="text-purple-600 dark:text-purple-400">
                    {currencySymbol}{selectedPayment.amount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-emerald-600 mt-1">
                  <span>STATUS:</span>
                  <span className="font-bold uppercase">{selectedPayment.status}</span>
                </div>
              </div>

              <div className="text-center text-[11px] text-slate-400 pt-1">
                Thank you for choosing {activeBusiness.name}!
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => window.print()}
                className="velcora-btn-primary flex items-center gap-1.5 w-full justify-center cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

