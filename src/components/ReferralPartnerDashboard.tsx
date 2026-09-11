import React, { useState, useEffect } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { useVelcora } from '../context/VelcoraContext';
import {
  Share2, Shield, DollarSign, CheckCircle2, AlertTriangle, Copy, Check,
  ExternalLink, Users, FileText, ArrowUpRight, Clock, RefreshCw, Lock,
  Sparkles, Sliders, ShieldCheck, AlertCircle, Ban, CheckCircle, Search,
  ChevronRight, Play, Eye, EyeOff, Info, HelpCircle
} from 'lucide-react';
import { ReferralPartnerStatus, CommissionStatus, ReferralConfig } from '../types';
import { FounderAdminPanel } from './FounderAdminPanel';

export const ReferralPartnerDashboard: React.FC = () => {
  const {
    activeUser,
    partnerProfile,
    partnerDashboard,
    referralConfig,
    referralLoading,
    referralError,
    fetchPartnerStatus,
    fetchPartnerDashboard,
    fetchAdminReferralOverview,
    adminReferralOverview,
    applyToBecomePartner,
    updatePartnerStatusByAdmin,
    transitionCommissionByAdmin,
    updateReferralConfigByAdmin,
    simulateRefundReversal,
    processSubscriptionPaymentWithReferral,
    runReferralSecurityTest,
  } = useVelcora();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'hub' | 'docs' | 'admin'>('hub');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Application form state
  const [payoutMethod, setPayoutMethod] = useState('PayPal');
  const [payoutDetails, setPayoutDetails] = useState('');
  const [applicationNotes, setApplicationNotes] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [applicationMsg, setApplicationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Admin interactive controls state
  const [adminPartnerSearch, setAdminPartnerSearch] = useState('');
  const [adminStatusFilter, setAdminStatusFilter] = useState<string>('ALL');
  const [adminCommissionFilter, setAdminCommissionFilter] = useState<string>('ALL');
  const [selectedPartnerForNotes, setSelectedPartnerForNotes] = useState<{ id: string; action: ReferralPartnerStatus } | null>(null);
  const [adminActionNotes, setAdminActionNotes] = useState('');

  // Simulator state
  const [simPlanName, setSimPlanName] = useState('Velcora Pro Plan');
  const [simAmount, setSimAmount] = useState(29.00);
  const [simTxId, setSimTxId] = useState(`tx_sim_${Date.now().toString().slice(-6)}`);
  const [simRefCode, setSimRefCode] = useState('VEL453821');
  const [simResult, setSimResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Security Test State
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<{ success: boolean; allPassed: boolean; results: any[] } | null>(null);

  // Config edit state
  const [editingConfig, setEditingConfig] = useState<Partial<ReferralConfig>>({});
  const [configSaveMsg, setConfigSaveMsg] = useState<string | null>(null);

  const isAdminOrOwner = 
    activeUser?.roleId === 'role-owner' ||
    (activeUser?.roleName || '').toLowerCase().includes('owner') ||
    (activeUser?.roleName || '').toLowerCase().includes('admin') ||
    (activeUser?.roleName || '').toLowerCase().includes('manager');

  useEffect(() => {
    fetchPartnerStatus();
    if (isAdminOrOwner) {
      fetchAdminReferralOverview();
    }
  }, [activeUser.id]);

  useEffect(() => {
    if (referralConfig) {
      setEditingConfig(referralConfig);
    }
  }, [referralConfig]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = (code: string) => {
    const link = `${window.location.origin}/signup?ref=${code}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      setApplicationMsg({ type: 'error', text: 'You must agree to the Velcora Partner Terms and Ethical Marketing Policy.' });
      return;
    }
    setApplicationMsg(null);
    const res = await applyToBecomePartner({
      payoutMethod,
      payoutDetails,
      applicationNotes,
    });
    if (res.success) {
      setApplicationMsg({ type: 'success', text: res.message });
      await fetchPartnerStatus();
    } else {
      setApplicationMsg({ type: 'error', text: res.message });
    }
  };

  const handleAdminPartnerStatus = async (partnerId: string, status: ReferralPartnerStatus) => {
    const res = await updatePartnerStatusByAdmin(partnerId, status, adminActionNotes || undefined);
    if (res.success) {
      setSelectedPartnerForNotes(null);
      setAdminActionNotes('');
      await fetchAdminReferralOverview();
      await fetchPartnerStatus();
    }
  };

  const handleAdminCommissionStatus = async (commId: string, status: CommissionStatus) => {
    const res = await transitionCommissionByAdmin(commId, status, 'Transitioned via Admin Dashboard');
    if (res.success) {
      await fetchAdminReferralOverview();
      await fetchPartnerDashboard();
    }
  };

  const handleSaveConfig = async () => {
    setConfigSaveMsg(null);
    const res = await updateReferralConfigByAdmin(editingConfig);
    setConfigSaveMsg(res.message);
    setTimeout(() => setConfigSaveMsg(null), 4000);
  };

  const handleRunSecuritySuite = async () => {
    setIsRunningTests(true);
    const results = await runReferralSecurityTest();
    setTestResults(results);
    setIsRunningTests(false);
  };

  const handleSimulatePayment = async () => {
    setSimResult(null);
    const res = await processSubscriptionPaymentWithReferral(simPlanName, simAmount, simTxId);
    if (res.success) {
      setSimResult({ type: 'success', text: res.message });
      setSimTxId(`tx_sim_${Date.now().toString().slice(-6)}`);
      await fetchAdminReferralOverview();
      await fetchPartnerDashboard();
    } else {
      setSimResult({ type: 'error', text: res.message });
    }
  };

  const handleSimulateRefund = async (txRef: string) => {
    const res = await simulateRefundReversal(txRef, '30-Day Money-Back Guarantee Refund Simulation');
    if (res.success) {
      alert(`Refund reversed successfully: ${res.message}`);
      await fetchAdminReferralOverview();
      await fetchPartnerDashboard();
    } else {
      alert(`Error reversing refund: ${res.message}`);
    }
  };

  return (
    <div id="velcora-referral-hub" className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#111C30] p-6 lg:p-8 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-[#F8FAFC] tracking-tight">
                Velcora Referral & Commission Hub
              </h1>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">
                Production attribution engine, partner tracking, commission lifecycle & verified payouts
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#0B1220] rounded-2xl border border-slate-200 dark:border-[#1F2E4D] self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('hub')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'hub'
                ? 'bg-white dark:bg-[#111C30] text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Partner Hub
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('docs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'docs'
                ? 'bg-white dark:bg-[#111C30] text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Documentation & Rules
          </button>
          {isAdminOrOwner && (
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'admin'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Admin Oversight
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: PARTNER HUB */}
      {activeTab === 'hub' && (
        <div className="space-y-6">
          {/* Active Partner Dashboard View */}
          {partnerProfile?.status === 'ACTIVE' && partnerDashboard ? (
            <div className="space-y-6">
              {/* Partner Card with Referral Code */}
              <div className="bg-linear-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 lg:p-8 rounded-3xl shadow-md space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold uppercase tracking-wider">
                        Active Partner
                      </span>
                      <span className="text-xs text-indigo-200">
                        Partner ID: {partnerProfile.id}
                      </span>
                    </div>
                    <h2 className="text-xl lg:text-2xl font-black">
                      Welcome, {partnerProfile.userName}
                    </h2>
                    <p className="text-xs text-indigo-200 max-w-xl">
                      Earn <strong className="text-white">${partnerDashboard.referralRateAmount || 3.00} USD</strong> for every verified business subscription attributed through your unique code or link.
                    </p>
                  </div>

                  {/* Cryptographic Code Box */}
                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 space-y-2 self-start md:self-auto min-w-[240px]">
                    <div className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider">
                      Your Unique Referral Code
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-2xl font-black tracking-widest text-amber-300">
                        {partnerProfile.referralCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(partnerProfile.referralCode)}
                        className="px-3 py-1.5 rounded-xl bg-white text-indigo-900 hover:bg-amber-300 hover:text-indigo-950 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedCode ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Direct Share Link Box */}
                <div className="pt-4 border-t border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-indigo-200 w-full sm:w-auto overflow-hidden">
                    <Share2 className="w-4 h-4 shrink-0 text-amber-300" />
                    <span className="font-mono text-[11px] truncate bg-black/30 px-3 py-1.5 rounded-xl border border-white/10 select-all">
                      {window.location.origin}/signup?ref={partnerProfile.referralCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyLink(partnerProfile.referralCode)}
                    className="px-4 py-1.5 rounded-xl bg-indigo-500/30 hover:bg-indigo-500/50 border border-white/20 text-white font-bold text-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedLink ? 'Link Copied' : 'Copy Referral Link'}
                  </button>
                </div>
              </div>

              {/* 4-Stat Metric Cards Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-[#111C30] p-5 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-400 dark:text-[#94A3B8]">
                    <span className="text-xs font-bold">Successful Referrals</span>
                    <Users className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-[#F8FAFC]">
                    {partnerDashboard.metrics.totalReferrals}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-[#94A3B8] font-medium">
                    Attributed new subscriptions
                  </div>
                </div>

                <div className="bg-white dark:bg-[#111C30] p-5 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-400 dark:text-[#94A3B8]">
                    <span className="text-xs font-bold">Total Earned</span>
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-[#F8FAFC]">
                    ${(partnerDashboard.metrics?.totalCommissionEarned ?? 0).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    Cumulative lifetime commission
                  </div>
                </div>

                <div className="bg-white dark:bg-[#111C30] p-5 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-400 dark:text-[#94A3B8]">
                    <span className="text-xs font-bold">Pending Verification</span>
                    <Clock className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                    ${(partnerDashboard.metrics?.pendingCommissionAmount ?? 0).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-[#94A3B8] font-medium">
                    In 14-day anti-fraud hold period
                  </div>
                </div>

                <div className="bg-white dark:bg-[#111C30] p-5 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-400 dark:text-[#94A3B8]">
                    <span className="text-xs font-bold">Available for Payout</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    ${(partnerDashboard.metrics?.availableCommissionAmount ?? 0).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-[#94A3B8] font-medium">
                    Ready for withdrawal
                  </div>
                </div>
              </div>

              {/* Payout Gateway Notice & Info Banner */}
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-4 rounded-2xl flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
                <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">Automated Payout Gateway Configuration Notice</div>
                  <p className="text-[11px] leading-relaxed">
                    Direct automated payouts via Stripe Connect and automated ACH are currently in pending gateway configuration. In the interim, all earnings are strictly audited, ledgered, and distributed to your registered payout account ({partnerProfile.payoutMethod || 'PayPal'} - {partnerProfile.payoutDetails || 'Registered Email'}) upon reaching the ${referralConfig?.minimumPayoutAmount || 20}.00 USD minimum threshold.
                  </p>
                </div>
              </div>

              {/* Anonymous Activity Stream */}
              <div className="bg-white dark:bg-[#111C30] p-6 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-[#F8FAFC]">
                      Attributed Referral Events & Commission Timeline
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                      Real-time ledger of attributed subscription events. Customer PII is strictly protected.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchPartnerDashboard}
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0B1220] transition cursor-pointer"
                    title="Refresh Activity"
                  >
                    <RefreshCw className={`w-4 h-4 ${referralLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {partnerDashboard.recentActivity.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-[#0B1220] rounded-2xl border border-slate-200 dark:border-[#1F2E4D] space-y-2">
                    <Share2 className="w-8 h-8 mx-auto text-slate-400" />
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      No referral subscriptions attributed yet
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] max-w-sm mx-auto">
                      Share your unique code <strong>{partnerProfile.referralCode}</strong> with business owners or retail stores to start earning $3.00 USD per verified plan.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-[#1F2E4D] text-slate-400 font-bold">
                          <th className="pb-3 px-3">Date</th>
                          <th className="pb-3 px-3">Event Ref</th>
                          <th className="pb-3 px-3">Subscription Tier</th>
                          <th className="pb-3 px-3">Commission</th>
                          <th className="pb-3 px-3">Status</th>
                          <th className="pb-3 px-3">Hold Release Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[#1F2E4D]/60 font-medium">
                        {partnerDashboard.recentActivity.map((evt) => {
                          const isPending = evt.status === 'PENDING';
                          const isAvailable = evt.status === 'AVAILABLE' || evt.status === 'APPROVED';
                          const isPaid = evt.status === 'PAID';
                          const isReversed = evt.status === 'REVERSED';

                          return (
                            <tr key={evt.id} className="hover:bg-slate-50/50 dark:hover:bg-[#0B1220]/50 transition">
                              <td className="py-3 px-3 text-slate-600 dark:text-[#94A3B8]">
                                {new Date(evt.eventDate).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-3 font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                                {evt.referenceHash}
                              </td>
                              <td className="py-3 px-3 font-bold text-slate-800 dark:text-[#F8FAFC]">
                                {evt.planName}
                              </td>
                              <td className="py-3 px-3 font-extrabold text-emerald-600 dark:text-emerald-400">
                                +${(evt.commissionAmount ?? 0).toFixed(2)} USD
                              </td>
                              <td className="py-3 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isPending ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' :
                                  isAvailable ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' :
                                  isPaid ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                                  'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                                }`}>
                                  {evt.status}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-slate-500 dark:text-[#94A3B8]">
                                {evt.holdReleaseDate ? new Date(evt.holdReleaseDate).toLocaleDateString() : 'N/A'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : partnerProfile?.status === 'PENDING' ? (
            /* Pending Approval State */
            <div className="bg-white dark:bg-[#111C30] p-8 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-xs text-center space-y-4 max-w-2xl mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                <Clock className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-[#F8FAFC]">
                Partner Application Under Review
              </h2>
              <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">
                Thank you for applying to the Velcora Partner Program. Your application is currently under review by our compliance team. Once approved, your unique cryptographic code (e.g. <strong>VEL453821</strong>) will be activated instantly.
              </p>
              <div className="p-4 bg-slate-50 dark:bg-[#0B1220] rounded-2xl border border-slate-200 dark:border-[#1F2E4D] text-left text-xs space-y-1 font-mono">
                <div><span className="text-slate-400">Applicant:</span> {partnerProfile.userName} ({partnerProfile.userEmail})</div>
                <div><span className="text-slate-400">Payout Method:</span> {partnerProfile.payoutMethod || 'PayPal'}</div>
                <div><span className="text-slate-400">Submitted:</span> {new Date(partnerProfile.createdAt).toLocaleString()}</div>
              </div>
              <button
                type="button"
                onClick={fetchPartnerStatus}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer"
              >
                Check Application Status
              </button>
            </div>
          ) : partnerProfile?.status === 'SUSPENDED' || partnerProfile?.status === 'REVOKED' ? (
            /* Suspended / Revoked State */
            <div className="bg-white dark:bg-[#111C30] p-8 rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-xs text-center space-y-4 max-w-2xl mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <Ban className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-extrabold text-rose-600 dark:text-rose-400">
                Partner Account {partnerProfile.status}
              </h2>
              <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">
                This partner account has been {partnerProfile.status.toLowerCase()} in accordance with Velcora's ethical marketing and anti-fraud guidelines. Attribution tracking for your code has been halted.
              </p>
              {partnerProfile.adminNotes && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900/40 text-left text-xs text-rose-800 dark:text-rose-300">
                  <strong>Compliance Note:</strong> {partnerProfile.adminNotes}
                </div>
              )}
            </div>
          ) : (
            /* Application Form for Non-Partners */
            <div className="bg-white dark:bg-[#111C30] p-6 lg:p-8 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-xs space-y-6 max-w-3xl mx-auto">
              <div className="space-y-2 text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-[#F8FAFC]">
                  Join the Velcora Partner Program
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] max-w-md mx-auto">
                  Earn $3.00 USD per verified customer subscription with transparent attribution, 14-day anti-fraud hold protection, and direct ledgered payouts.
                </p>
              </div>

              {/* 3 Pillars */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] space-y-1.5">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                  <div className="text-xs font-bold text-slate-800 dark:text-[#F8FAFC]">$3.00 USD Fixed Reward</div>
                  <div className="text-[11px] text-slate-500 dark:text-[#94A3B8]">Paid on qualifying Pro & Enterprise business plans.</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] space-y-1.5">
                  <ShieldCheck className="w-5 h-5 text-indigo-500" />
                  <div className="text-xs font-bold text-slate-800 dark:text-[#F8FAFC]">14-Day Anti-Fraud Hold</div>
                  <div className="text-[11px] text-slate-500 dark:text-[#94A3B8]">Full protection against refunds and chargebacks.</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] space-y-1.5">
                  <Lock className="w-5 h-5 text-amber-500" />
                  <div className="text-xs font-bold text-slate-800 dark:text-[#F8FAFC]">Zero PII Disclosure</div>
                  <div className="text-[11px] text-slate-500 dark:text-[#94A3B8]">Customer privacy is strictly preserved by design.</div>
                </div>
              </div>

              {applicationMsg && (
                <div className={`p-4 rounded-2xl text-xs flex items-center gap-2.5 ${
                  applicationMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40'
                }`}>
                  {applicationMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{applicationMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleApply} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1.5">
                      Preferred Payout Method
                    </label>
                    <select
                      value={payoutMethod}
                      onChange={(e) => setPayoutMethod(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-bold text-slate-900 dark:text-[#F8FAFC] focus:border-indigo-600 focus:outline-hidden"
                    >
                      <option value="PayPal">PayPal (Instant Payouts)</option>
                      <option value="Wise">Wise (International Transfers)</option>
                      <option value="BankWire">Direct Bank Wire / ACH</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1.5">
                      Payout Account Email / ID
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. partner.payout@gmail.com"
                      value={payoutDetails}
                      onChange={(e) => setPayoutDetails(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-indigo-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="text-xs">
                  <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1.5">
                    Marketing Channels & Business Background
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Tell us about how you plan to introduce Velcora (e.g. retail consultancy, YouTube tech channel, POS installation client network, business blog)..."
                    value={applicationNotes}
                    onChange={(e) => setApplicationNotes(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-indigo-600 focus:outline-hidden"
                  />
                </div>

                <div className="p-4 bg-slate-50 dark:bg-[#0B1220] rounded-2xl border border-slate-200 dark:border-[#1F2E4D] space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-0.5 rounded-md text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-[11px] text-slate-600 dark:text-[#94A3B8] leading-relaxed">
                      I agree to the <strong>Velcora Partner Agreement</strong> and <strong>Ethical Marketing Policy</strong>. I understand that spamming, trademark bidding on search ads, self-referrals, and misleading claims result in immediate termination of partner status.
                    </span>
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={referralLoading}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition active:scale-98 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                  >
                    {referralLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Submit Partner Application</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DOCUMENTATION & RULES */}
      {activeTab === 'docs' && (
        <div className="bg-white dark:bg-[#111C30] p-6 lg:p-8 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-xs space-y-8 max-w-4xl mx-auto">
          <div className="border-b border-slate-200 dark:border-[#1F2E4D] pb-4 space-y-1">
            <h2 className="text-xl font-black text-slate-900 dark:text-[#F8FAFC]">
              Velcora Partner Program Guidelines & Architecture
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
              Standardized policies, commission accounting, security protections, and ethical marketing guidelines.
            </p>
          </div>

          <div className="space-y-6 text-xs text-slate-700 dark:text-[#94A3B8] leading-relaxed">
            {/* Section 1 */}
            <div className="space-y-2">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black">1</span>
                Reward Structure & Eligible Plans
              </h3>
              <p>
                Authorized Velcora referral partners receive a fixed reward of <strong className="text-slate-900 dark:text-white">$3.00 USD</strong> for each eligible new customer subscription. Eligible plans include all active paid tiers (e.g. <em>Velcora Pro Monthly</em>, <em>Velcora Pro Annual</em>, <em>Velcora Enterprise</em>). Free trials or zero-dollar plans do not trigger commission payouts.
              </p>
            </div>

            {/* Section 2 */}
            <div className="space-y-2">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black">2</span>
                Referral Code Format & Attribution
              </h3>
              <p>
                Referral codes are cryptographically generated in the canonical format <code className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#0B1220] font-mono text-indigo-600 dark:text-indigo-400 font-bold">VEL + 6 digits</code> (e.g. <strong>VEL453821</strong>).
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li><strong>URL Parameter:</strong> Visitors clicking links with <code className="font-mono">?ref=VELxxxxxx</code> automatically receive an attribution token stored securely for 30 days.</li>
                <li><strong>Checkout Code Field:</strong> Customers can also enter the code directly in the billing/subscription screen.</li>
                <li><strong>Attribution Rule:</strong> Attribution is locked on the first completed payment transaction and cannot be reassigned.</li>
              </ul>
            </div>

            {/* Section 3 */}
            <div className="space-y-2">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black">3</span>
                Commission Lifecycle & 14-Day Anti-Fraud Hold
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                <div className="p-3 bg-slate-50 dark:bg-[#0B1220] rounded-xl border border-slate-200 dark:border-[#1F2E4D]">
                  <div className="font-bold text-amber-600 dark:text-amber-400">1. PENDING</div>
                  <div className="text-[10px] text-slate-500 font-sans mt-1">14-day hold period to accommodate satisfaction guarantees.</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-[#0B1220] rounded-xl border border-slate-200 dark:border-[#1F2E4D]">
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">2. APPROVED / AVAILABLE</div>
                  <div className="text-[10px] text-slate-500 font-sans mt-1">Hold cleared. Funds mature and become available for payout.</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-[#0B1220] rounded-xl border border-slate-200 dark:border-[#1F2E4D]">
                  <div className="font-bold text-blue-600 dark:text-blue-400">3. PAID</div>
                  <div className="text-[10px] text-slate-500 font-sans mt-1">Disbursed to partner's PayPal, Wise, or ACH account.</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-[#0B1220] rounded-xl border border-slate-200 dark:border-[#1F2E4D]">
                  <div className="font-bold text-rose-600 dark:text-rose-400">4. REVERSED</div>
                  <div className="text-[10px] text-slate-500 font-sans mt-1">Reversed automatically in the event of a customer refund or dispute.</div>
                </div>
              </div>
            </div>

            {/* Section 4 */}
            <div className="space-y-2">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black">4</span>
                Customer Privacy Architecture
              </h3>
              <p>
                Velcora strictly enforces customer privacy. Partner dashboards receive anonymous reference hashes only. Partners <strong>NEVER</strong> receive customer names, email addresses, phone numbers, credit card tokens, physical addresses, or store identifiers.
              </p>
            </div>

            {/* Section 5 */}
            <div className="space-y-2">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black">5</span>
                Ethical Marketing & Anti-Spam Code of Conduct
              </h3>
              <div className="p-4 bg-slate-50 dark:bg-[#0B1220] rounded-2xl border border-slate-200 dark:border-[#1F2E4D] space-y-2">
                <div className="font-bold text-slate-900 dark:text-[#F8FAFC]">Strictly Prohibited Practices:</div>
                <ul className="list-disc list-inside space-y-1 pl-2 text-[11px]">
                  <li>Bidding on Velcora brand keywords ("Velcora", "Velcora POS", "Velcora coupon") on Google Ads, Bing Ads, etc.</li>
                  <li>Sending unsolicited commercial email (spam) or automated scraping blasts.</li>
                  <li>Creating misleading discount claims (e.g. claiming a 90% coupon that does not exist).</li>
                  <li>Self-referral: You cannot use your own referral code to purchase your own subscription accounts.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ADMIN OVERSIGHT & CONTROLS */}
      {activeTab === 'admin' && isAdminOrOwner && (
        <div className="space-y-6">
          {/* Admin Header Stats */}
          {adminReferralOverview && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-[#111C30] p-5 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-xs space-y-1">
                <span className="text-xs font-bold text-slate-400">Total Partners</span>
                <div className="text-2xl font-black text-slate-900 dark:text-[#F8FAFC]">
                  {adminReferralOverview.partners?.length || 0}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">Registered partner accounts</div>
              </div>

              <div className="bg-white dark:bg-[#111C30] p-5 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-xs space-y-1">
                <span className="text-xs font-bold text-slate-400">Total Commissions Ledgered</span>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  ${(adminReferralOverview.commissions?.reduce((acc: number, c: any) => acc + (c.status !== 'REVERSED' ? (c.commissionAmount || 0) : 0), 0) ?? 0).toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">Across all active referral events</div>
              </div>

              <div className="bg-white dark:bg-[#111C30] p-5 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-xs space-y-1">
                <span className="text-xs font-bold text-slate-400">Pending Holds</span>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                  {adminReferralOverview.commissions?.filter((c: any) => c.status === 'PENDING').length || 0}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">In 14-day anti-fraud window</div>
              </div>

              <div className="bg-white dark:bg-[#111C30] p-5 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-xs space-y-1">
                <span className="text-xs font-bold text-slate-400">Audit Logs</span>
                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  {adminReferralOverview.auditLogs?.length || 0}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">Immutable state changes</div>
              </div>
            </div>
          )}

          {/* Section: Live Security & Integrity Test Suite */}
          <div className="bg-white dark:bg-[#111C30] p-6 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Referral System Security, Attribution & Integrity Test Suite
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  Executes automated verification tests for code formatting, self-referral prevention, idempotency, and PII isolation.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunSecuritySuite}
                disabled={isRunningTests}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 self-start sm:self-auto"
              >
                {isRunningTests ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isRunningTests ? 'Running Suite...' : 'Run Security Suite'}</span>
              </button>
            </div>

            {testResults && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`font-extrabold text-xs flex items-center gap-1.5 ${
                    testResults.allPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {testResults.allPassed ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    {testResults.allPassed ? 'All Security Checks Passed (100% Secure)' : 'Some Checks Failed'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {testResults.results.length} tests executed
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {testResults.results.map((r, i) => (
                    <div key={i} className="p-2.5 bg-white dark:bg-[#111C30] rounded-xl border border-slate-200 dark:border-[#1F2E4D] flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-800 dark:text-[#F8FAFC]">{r.name}</div>
                        <div className="text-[10px] text-slate-400">{r.detail}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                        r.passed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {r.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section: Live Payment & Refund Simulation Engine */}
          <div className="bg-white dark:bg-[#111C30] p-6 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-xs space-y-4">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-[#F8FAFC]">
                Live Subscription & Reversal Simulation Engine
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                Test the end-to-end webhook ingestion, attribution lock, pending hold creation, and refund reversal workflow.
              </p>
            </div>

            {simResult && (
              <div className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 ${
                simResult.type === 'success' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200' : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200'
              }`}>
                {simResult.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{simResult.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Plan Tier</label>
                <input
                  type="text"
                  value={simPlanName}
                  onChange={(e) => setSimPlanName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Amount ($)</label>
                <input
                  type="number"
                  value={simAmount}
                  onChange={(e) => setSimAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Referral Code</label>
                <input
                  type="text"
                  value={simRefCode}
                  onChange={(e) => setSimRefCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                >
                  Simulate Ingest Payment
                </button>
              </div>
            </div>
          </div>

          {/* Section: Partner Roster Management */}
          <div className="bg-white dark:bg-[#111C30] p-6 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-[#F8FAFC]">
                  Partner Roster & Approvals
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  Manage partner onboarding, cryptographic code issuance, suspension, and revocation.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search partner or code..."
                    value={adminPartnerSearch}
                    onChange={(e) => setAdminPartnerSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <select
                  value={adminStatusFilter}
                  onChange={(e) => setAdminStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING">Pending</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="REVOKED">Revoked</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#1F2E4D] text-slate-400 font-bold">
                    <th className="pb-3 px-3">Partner</th>
                    <th className="pb-3 px-3">Referral Code</th>
                    <th className="pb-3 px-3">Payout Details</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3">Metrics</th>
                    <th className="pb-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1F2E4D]/60 font-medium">
                  {(adminReferralOverview?.partners || [])
                    .filter((p: any) => {
                      if (adminStatusFilter !== 'ALL' && p.status !== adminStatusFilter) return false;
                      if (adminPartnerSearch) {
                        const q = adminPartnerSearch.toLowerCase();
                        return (
                          p.userName?.toLowerCase().includes(q) ||
                          p.userEmail?.toLowerCase().includes(q) ||
                          p.referralCode?.toLowerCase().includes(q)
                        );
                      }
                      return true;
                    })
                    .map((p: any, idx: number) => (
                      <tr key={p.partnerId || p.id || `partner-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-[#0B1220]/50 transition">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">{p.userName}</div>
                          <div className="text-[11px] text-slate-400">{p.userEmail}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {p.referralCode || 'Pending Issue'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                            {p.payoutMethod || 'PayPal'}: {p.payoutDetails || 'Not Provided'}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' :
                            p.status === 'PENDING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' :
                            'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[11px]">
                          <div>Ref: <strong>{p.totalReferrals || 0}</strong></div>
                          <div>Earned: <strong className="text-emerald-600">${(p.totalEarned || 0).toFixed(2)}</strong></div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {p.status === 'PENDING' && (
                              <button
                                type="button"
                                onClick={() => handleAdminPartnerStatus(p.partnerId || p.id, 'ACTIVE')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 transition"
                              >
                                Approve & Issue Code
                              </button>
                            )}
                            {p.status === 'ACTIVE' && (
                              <button
                                type="button"
                                onClick={() => handleAdminPartnerStatus(p.partnerId || p.id, 'SUSPENDED')}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold text-[11px] hover:bg-amber-500/20 transition"
                              >
                                Suspend
                              </button>
                            )}
                            {p.status === 'SUSPENDED' && (
                              <button
                                type="button"
                                onClick={() => handleAdminPartnerStatus(p.partnerId || p.id, 'ACTIVE')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 transition"
                              >
                                Reactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Full Commission Ledger Oversight */}
          <div className="bg-white dark:bg-[#111C30] p-6 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-[#F8FAFC]">
                  Full Commission Ledger
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  State transitions, verification hold release, and manual refund reversals.
                </p>
              </div>

              <select
                value={adminCommissionFilter}
                onChange={(e) => setAdminCommissionFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-xs font-bold text-slate-900 dark:text-white"
              >
                <option value="ALL">All Lifecycle Stages</option>
                <option value="PENDING">Pending (Hold)</option>
                <option value="APPROVED">Approved</option>
                <option value="AVAILABLE">Available for Payout</option>
                <option value="PAID">Paid</option>
                <option value="REVERSED">Reversed</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#1F2E4D] text-slate-400 font-bold">
                    <th className="pb-3 px-3">Commission ID</th>
                    <th className="pb-3 px-3">Partner Code</th>
                    <th className="pb-3 px-3">Plan & Tx Ref</th>
                    <th className="pb-3 px-3">Amount</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3 text-right">Lifecycle Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1F2E4D]/60 font-medium">
                  {(adminReferralOverview?.commissions || [])
                    .filter((c: any) => adminCommissionFilter === 'ALL' || c.status === adminCommissionFilter)
                    .map((c: any, idx: number) => (
                      <tr key={c.commissionId || c.id || `comm-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-[#0B1220]/50 transition">
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                          {c.commissionId || c.id}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {c.referralCode}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800 dark:text-white">{c.planName}</div>
                          <div className="text-[10px] font-mono text-slate-400">{c.transactionReference}</div>
                        </td>
                        <td className="py-3 px-3 font-extrabold text-emerald-600 dark:text-emerald-400">
                          ${(c.commissionAmount ?? 0).toFixed(2)} USD
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === 'PENDING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' :
                            c.status === 'AVAILABLE' || c.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' :
                            c.status === 'PAID' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                            'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {c.status === 'PENDING' && (
                              <button
                                type="button"
                                onClick={() => handleAdminCommissionStatus(c.commissionId || c.id, 'AVAILABLE')}
                                className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] hover:bg-emerald-700 transition"
                              >
                                Release Hold
                              </button>
                            )}
                            {c.status === 'AVAILABLE' && (
                              <button
                                type="button"
                                onClick={() => handleAdminCommissionStatus(c.commissionId || c.id, 'PAID')}
                                className="px-2 py-1 rounded-lg bg-blue-600 text-white font-bold text-[10px] hover:bg-blue-700 transition"
                              >
                                Mark Paid
                              </button>
                            )}
                            {c.status !== 'REVERSED' && (
                              <button
                                type="button"
                                onClick={() => handleSimulateRefund(c.transactionReference)}
                                className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40 font-bold text-[10px] hover:bg-rose-100 transition"
                              >
                                Reverse Refund
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Program Settings Editor */}
          <div className="bg-white dark:bg-[#111C30] p-6 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-[#F8FAFC]">
                  Global Program Rules & Fraud Parameters
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  Adjust default reward amounts, hold durations, and fraud rules.
                </p>
              </div>
              {configSaveMsg && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  ✓ {configSaveMsg}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">
                  Commission Per Subscription ($ USD)
                </label>
                <input
                  type="number"
                  value={editingConfig.defaultCommissionAmount || 3.00}
                  onChange={(e) => setEditingConfig(prev => ({ ...prev, defaultCommissionAmount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">
                  Anti-Fraud Hold Period (Days)
                </label>
                <input
                  type="number"
                  value={editingConfig.verificationHoldDays || 14}
                  onChange={(e) => setEditingConfig(prev => ({ ...prev, verificationHoldDays: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">
                  Minimum Payout Threshold ($ USD)
                </label>
                <input
                  type="number"
                  value={editingConfig.minimumPayoutAmount || 20.00}
                  onChange={(e) => setEditingConfig(prev => ({ ...prev, minimumPayoutAmount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-white font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={editingConfig.preventSelfReferrals ?? true}
                  onChange={(e) => setEditingConfig(prev => ({ ...prev, preventSelfReferrals: e.target.checked }))}
                  className="rounded-md text-indigo-600 focus:ring-indigo-500"
                />
                <span>Enforce Self-Referral Prevention (Blocks self-attribution)</span>
              </label>

              <button
                type="button"
                onClick={handleSaveConfig}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition"
              >
                Save Parameter Changes
              </button>
            </div>
          </div>

          {/* Section: Founder & Super Admin Global Controls */}
          <div className="pt-4 border-t border-slate-200 dark:border-[#1F2E4D]">
            <FounderAdminPanel />
          </div>
        </div>
      )}
    </div>
  );
};
