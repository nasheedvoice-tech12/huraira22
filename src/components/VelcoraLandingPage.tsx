import React, { useState, useEffect } from 'react';
import { useVelcora } from '../context/VelcoraContext';
import {
  ShoppingCart, CreditCard, Zap, Sparkles, ShieldCheck, Layers, Globe,
  ArrowRight, Check, CheckCircle2, Users, Percent, DollarSign, TrendingUp,
  BarChart3, Package, Clock, Smartphone, Scan, Tag, ChevronRight, Star,
  Award, HelpCircle, Lock, RefreshCw, Play, Flame, Sliders, Store,
  Share2, ChevronDown, Monitor, CheckCircle, ExternalLink, Wallet,
  Sparkle, Rocket
} from 'lucide-react';
import { VelcoraWordmark } from './VelcoraWordmark';

interface VelcoraLandingPageProps {
  onLaunchPos: () => void;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
  onOpenReferral: () => void;
  onQuickDemo: () => void;
}

export const VelcoraLandingPage: React.FC<VelcoraLandingPageProps> = ({
  onLaunchPos,
  onOpenAuth,
  onOpenReferral,
  onQuickDemo,
}) => {
  const { subscriptionPlans } = useVelcora();

  // Navigation / Scroll
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');
  const [activeEcosystemTab, setActiveEcosystemTab] = useState<'pos' | 'referral'>('pos');
  
  // Interactive Referral Income Calculator State
  const [calcStoreCount, setCalcStoreCount] = useState<number>(15);
  const [calcPlanPrice, setCalcPlanPrice] = useState<number>(39);
  const [calcCommissionRate, setCalcCommissionRate] = useState<number>(20);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Animation States
  const [isVisible, setIsVisible] = useState(false);
  const [animatedCredits, setAnimatedCredits] = useState(0);

  // Derived Calculator Earnings
  const monthlyEarnings = Math.round((calcStoreCount * calcPlanPrice * (calcCommissionRate / 100)));
  const annualEarnings = monthlyEarnings * 12;

  // Get user credits from context (credits stored on wallet in Firestore, not SubUser)
  const userCredits = 10000;

  // Animate credits on mount
  useEffect(() => {
    setIsVisible(true);
    const targetCredits = userCredits;
    const duration = 2000;
    const steps = 60;
    const increment = targetCredits / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= targetCredits) {
        setAnimatedCredits(targetCredits);
        clearInterval(timer);
      } else {
        setAnimatedCredits(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [userCredits]);

  const faqs = [
    {
      q: 'Does Velcora POS continue selling if my internet goes down?',
      a: 'Yes, 100%. Velcora features an autonomous Offline Cloud Synchronization engine. If your internet connection drops, you can continue scanning items, processing cash transactions, and printing receipts seamlessly. All transactions automatically queue and sync to the cloud database within seconds of reconnection.',
    },
    {
      q: 'How does the Velcora Referral Promoter Program work?',
      a: 'Our partner program is completely free and open globally. When you sign up as a promoter, you receive a unique referral link and promo code. When a business subscribes to any paid Velcora POS plan using your link, you earn up to 20% recurring monthly commission for the entire lifetime of their subscription.',
    },
    {
      q: 'What hardware is required to run Velcora POS?',
      a: 'Velcora is 100% universal and hardware-agnostic. You can run it on Windows PCs, Macs, iPads, Android tablets, touch terminals, or mobile smartphones. It works with standard USB and Bluetooth optical barcode scanners, thermal receipt printers (ESC/POS), and cash drawers.',
    },
    {
      q: 'Can I manage multiple retail branches and cashiers?',
      a: 'Yes! Velcora includes comprehensive multi-workstation support and granular staff role-based permissions (Cashier, Store Manager, Auditor, Inventory Officer). Staff members sign in using 4-digit PINs, and register drawers are audited per terminal.',
    },
    {
      q: 'How do referral payouts work and what is the minimum withdrawal?',
      a: 'Promoters can request payouts directly from their partner dashboard as soon as their balance reaches $50.00. We support instant disbursements via PayPal, Direct Bank Wire Transfer, and USDT (TRC-20 / ERC-20).',
    },
  ];

  return (
<div className="fixed inset-0 w-full h-full bg-[#050810] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white overflow-y-auto">
      {/* Dynamic Animated Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[20%] w-[650px] h-[650px] bg-indigo-600/20 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute top-[35%] right-[-5%] w-[550px] h-[550px] bg-purple-600/15 rounded-full blur-[160px] animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
        <div className="absolute bottom-[10%] left-[-10%] w-[600px] h-[600px] bg-emerald-600/15 rounded-full blur-[160px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
        <div className="absolute top-[60%] left-[50%] w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '7s', animationDelay: '3s' }} />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        {/* Floating Particles */}
        <div className="absolute top-[20%] left-[10%] w-2 h-2 bg-indigo-400 rounded-full animate-bounce opacity-60" style={{ animationDuration: '3s' }} />
        <div className="absolute top-[40%] right-[15%] w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce opacity-60" style={{ animationDuration: '4s', animationDelay: '1s' }} />
        <div className="absolute bottom-[30%] left-[25%] w-1 h-1 bg-emerald-400 rounded-full animate-bounce opacity-60" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }} />
        <div className="absolute top-[70%] right-[30%] w-2 h-2 bg-amber-400 rounded-full animate-bounce opacity-60" style={{ animationDuration: '4.5s', animationDelay: '1.5s' }} />
      </div>

      {/* Custom CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-10px) rotate(1deg); }
          66% { transform: translateY(5px) rotate(-1deg); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3); }
          50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.6), 0 0 60px rgba(139, 92, 246, 0.3); }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes rotate-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-shimmer { 
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
        .animate-glow-pulse { animation: glow-pulse 3s ease-in-out infinite; }
        .animate-gradient-shift {
          background-size: 200% 200%;
          animation: gradient-shift 3s ease infinite;
        }
        .animate-slide-up { animation: slide-up 0.6s ease-out forwards; }
        .animate-scale-in { animation: scale-in 0.5s ease-out forwards; }
        .animate-rotate-slow { animation: rotate-slow 20s linear infinite; }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .delay-400 { animation-delay: 400ms; }
        .delay-500 { animation-delay: 500ms; }
      `}</style>
    

      {/* =========================================================================
          TOP NAVIGATION BAR - ENHANCED
      ========================================================================= */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-[#050810]/90 border-b border-slate-800/60 transition-all duration-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Identity */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-2xl shadow-indigo-500/40 border border-indigo-400/30 animate-glow-pulse transition-transform duration-300 group-hover:scale-110">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-white bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent">VELCORA</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-indigo-500/30 to-purple-500/30 text-indigo-300 border border-indigo-500/40 animate-gradient-shift">
                  POS v8.0
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-400">Cloud Point-of-Sale & Partner Network</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-300">
            <a href="#ecosystem" className="hover:text-indigo-400 transition-all duration-300 hover:scale-105 relative group">
              Ecosystem
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#pos-features" className="hover:text-indigo-400 transition-all duration-300 hover:scale-105 relative group">
              POS Capabilities
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#pricing" className="hover:text-indigo-400 transition-all duration-300 hover:scale-105 relative group">
              Pricing
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 group-hover:w-full"></span>
            </a>
            <button onClick={onOpenReferral} className="hover:text-emerald-400 transition-all duration-300 hover:scale-105 relative group">
              Partner Program
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300 group-hover:w-full"></span>
            </button>
          </nav>

          {/* Right Side - Animated Credits Wallet & CTA */}
          <div className="flex items-center gap-4">
            {/* Animated Credit Wallet Badge */}
            <div className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-500/40 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all duration-500 hover:scale-105 cursor-pointer group relative overflow-hidden">
              <div className="relative">
                <Wallet className="w-5 h-5 text-amber-400 group-hover:animate-bounce" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-ping" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[9px] font-medium text-amber-300/80 uppercase tracking-wider">Credit Balance</span>
                <span className="text-sm font-black text-amber-300 tabular-nums">
                  {animatedCredits.toLocaleString()} <span className="text-[10px] font-bold"> Credits</span>
                </span>
              </div>
              <Sparkle className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '3s' }} />
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400/10 via-transparent to-amber-400/10 animate-shimmer pointer-events-none" />
            </div>

            <button
              onClick={onLaunchPos}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-500 text-white text-xs font-black shadow-xl shadow-indigo-500/30 transition-all duration-500 hover:shadow-indigo-500/50 hover:scale-105 animate-gradient-shift"
            >
              Launch POS
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          HERO SECTION - ENHANCED
      ========================================================================= */}
      <section className={`relative pt-16 pb-20 md:pt-24 md:pb-32 z-10 transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          
          {/* Top Announcement Pill - Animated */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-emerald-500/20 border border-indigo-500/40 shadow-2xl shadow-indigo-500/20 backdrop-blur-md animate-slide-up">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" style={{ animationDuration: '1.5s' }} />
            <span className="text-xs font-extrabold text-slate-200 bg-gradient-to-r from-indigo-300 via-purple-300 to-emerald-300 bg-clip-text text-transparent animate-gradient-shift">
              Autonomous Cloud POS • Sub-Second Optical Barcode OCR • 20% Lifetime Referral Commission
            </span>
          </div>

          {/* Main Hero Headline - Animated */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-[1.1] max-w-5xl mx-auto animate-slide-up delay-100">
            The Intelligent POS & Global Partner Ecosystem for{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent animate-gradient-shift">
              Modern Commerce
            </span>
          </h1>

          {/* Subtitle - Animated */}
          <p className="text-sm sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal animate-slide-up delay-200">
            Run your store with ultra-fast barcode checkout, real-time inventory, multi-workstation sync, and offline resilience. Or partner with Velcora to earn 20% recurring monthly income for every store you refer.
          </p>

          {/* Dual Action Buttons - Animated */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 max-w-lg mx-auto animate-slide-up delay-300">
            <button
              onClick={onLaunchPos}
              className="group w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/30 transition-all duration-500 hover:scale-105 hover:shadow-indigo-500/50 animate-glow-pulse cursor-pointer relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer pointer-events-none" />
              <ShoppingCart className="w-5 h-5 text-white transition-transform duration-300 group-hover:rotate-12" />
              <span>Open Velcora POS</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-2" />
            </button>

            <button
              onClick={onOpenReferral}
              className="group w-full sm:w-auto px-7 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-emerald-400 font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 border border-emerald-500/40 shadow-lg shadow-emerald-500/10 transition-all duration-500 hover:scale-105 hover:shadow-emerald-500/30 hover:border-emerald-500/60 cursor-pointer relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent animate-shimmer pointer-events-none" />
              <Share2 className="w-5 h-5 text-emerald-400 transition-transform duration-300 group-hover:rotate-12" />
              <span>Join Referral Program</span>
              <span className="text-xs bg-emerald-500/20 px-2 py-0.5 rounded-full text-emerald-300 font-black border border-emerald-500/40 group-hover:animate-pulse">20%</span>
            </button>
          </div>

          {/* Quick Demo Link */}
          <div className="pt-2">
            <button
              onClick={onQuickDemo}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer underline underline-offset-4 decoration-indigo-500 group"
            >
              <Play className="w-3.5 h-3.5 text-indigo-400 fill-current group-hover:animate-pulse" style={{ animationDuration: '2s' }} />
              <span>Click here to test instant live POS demo register (No signup needed)</span>
            </button>
          </div>

          {/* Trust Telemetry Metrics - Animated Counter Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12 max-w-4xl mx-auto border-t border-slate-800/80">
            {[
              { value: '99.99%', label: 'Cloud Sync Uptime', color: 'text-white', delay: 'delay-100' },
              { value: '<0.1s', label: 'Optical Barcode Scan', color: 'text-indigo-400', delay: 'delay-200' },
              { value: '20%', label: 'Monthly Referral Rate', color: 'text-emerald-400', delay: 'delay-300' },
              { value: '6 Global', label: 'Currencies Supported', color: 'text-amber-400', delay: 'delay-400' },
            ].map((metric, i) => (
              <div key={i} className={`p-4 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-900/30 border border-slate-800 text-center animate-slide-up ${metric.delay} transition-all duration-500 hover:border-indigo-500/40 hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/10 group`}>
                <div className="text-2xl sm:text-3xl font-black text-white tabular-nums">
                  <span className={`${metric.color} bg-gradient-to-r from-white/90 to-white/50 bg-clip-text transition-all duration-300`}>{metric.value}</span>
                </div>
                <div className="text-xs text-slate-400 mt-1 font-medium group-hover:text-slate-300 transition-colors">{metric.label}</div>
                <div className="mt-3 h-1 w-16 mx-auto rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          INTERACTIVE ECOSYSTEM DUAL-PILLARS (POS vs REFERRAL)
      ========================================================================= */}
      <section id="ecosystem" className="py-20 bg-slate-950/60 border-y border-slate-800/80 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-xs font-bold">
              <Layers className="w-3.5 h-3.5" />
              <span>Two Powerful Platforms. One Unified Ecosystem.</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Choose What You Want to Explore
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              Whether you are a retailer looking for the ultimate POS register or a promoter seeking recurring commissions, we have you covered.
            </p>
          </div>

          {/* Switcher Toggle - Animated */}
          <div className="flex justify-center animate-slide-up">
            <div className="p-1.5 rounded-2xl bg-slate-900 border border-slate-800 flex gap-2 shadow-2xl shadow-indigo-500/5 backdrop-blur-xl">
              <button
                onClick={() => setActiveEcosystemTab('pos')}
                className={`px-6 py-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2.5 transition-all duration-500 cursor-pointer relative ${
                  activeEcosystemTab === 'pos'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/40 scale-105'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <ShoppingCart className={`w-4 h-4 transition-transform duration-300 ${activeEcosystemTab === 'pos' ? 'animate-bounce' : ''}`} />
                <span>1. Velcora POS Platform</span>
                {activeEcosystemTab === 'pos' && <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />}
              </button>

              <button
                onClick={() => setActiveEcosystemTab('referral')}
                className={`px-6 py-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2.5 transition-all duration-500 cursor-pointer relative ${
                  activeEcosystemTab === 'referral'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/40 scale-105'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Share2 className={`w-4 h-4 transition-transform duration-300 ${activeEcosystemTab === 'referral' ? 'animate-bounce' : ''}`} />
                <span>2. Referral Partner Network</span>
                <span className="text-[10px] bg-emerald-400/20 px-1.5 py-0.5 rounded-full text-emerald-300 font-black border border-emerald-500/30">
                  Earn
                </span>
                {activeEcosystemTab === 'referral' && <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />}
              </button>
            </div>
          </div>

          {/* TAB 1: VELCORA POS PREVIEW - Animated */}
          {activeEcosystemTab === 'pos' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-indigo-950/40 rounded-3xl border border-slate-800/80 p-6 sm:p-10 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl animate-scale-in hover:border-indigo-500/30 transition-all duration-700">
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold">
                  <Store className="w-3.5 h-3.5" />
                  <span>Retail • Grocery • Restaurant • Wholesale</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  High-Speed Point-of-Sale Register with Zero Downtime
                </h3>

                <p className="text-sm text-slate-300 leading-relaxed">
                  Turn any device into an enterprise checkout counter. Velcora combines optical camera barcode scanning, multi-currency conversions, split-tender settlement, and real-time inventory ledgering in one frictionless screen.
                </p>

                <div className="space-y-3 text-xs">
                  {[
                    { icon: Scan, text: <span><strong>Instant Barcode Scanner:</strong> Works with mobile camera or USB laser scanner</span> },
                    { icon: Clock, text: <span><strong>Offline Autopilot:</strong> Process sales during outages; automatic cloud sync</span> },
                    { icon: Monitor, text: <span><strong>Multi-Terminal Sync:</strong> Connect unlimited cashiers with Staff PINs</span> },
                    { icon: Smartphone, text: <span><strong>Digital Passports & Receipts:</strong> Scannable QR and instant WhatsApp/SMS receipts</span> },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-slate-300 group transition-all duration-300 hover:translate-x-2 hover:text-white">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:animate-pulse transition-all">
                        <item.icon className="w-4 h-4" />
                      </div>
                      {item.text}
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex flex-wrap gap-4">
                  <button
                    onClick={onLaunchPos}
                    className="group px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all duration-500 hover:scale-105 hover:shadow-indigo-500/50 cursor-pointer overflow-hidden relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer pointer-events-none" />
                    <span>Launch POS Register</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-2" />
                  </button>

                  <button
                    onClick={onQuickDemo}
                    className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 transition-all duration-500 hover:scale-105 cursor-pointer border border-slate-700"
                  >
                    <Play className="w-3.5 h-3.5 text-amber-400 fill-current animate-pulse" style={{ animationDuration: '2s' }} />
                    <span>Try 1-Click Interactive Demo</span>
                  </button>
                </div>
              </div>

              {/* POS Terminal Visual Mockup */}
              <div className="lg:col-span-6 bg-slate-950 rounded-2xl border border-slate-800 p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                    <span className="text-xs font-mono text-slate-400 ml-2">register-01 • online</span>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    CLOUD SYNCED
                  </span>
                </div>

                {/* Mock Cart Items */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">1x</div>
                      <div>
                        <div className="font-bold text-white">Premium Organic Espresso</div>
                        <div className="text-[10px] text-slate-400 font-mono">SKU-ESP-994 • Tax 5%</div>
                      </div>
                    </div>
                    <span className="font-extrabold text-white">$4.50</span>
                  </div>

                  <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">2x</div>
                      <div>
                        <div className="font-bold text-white">Butter Croissant Bakery</div>
                        <div className="text-[10px] text-slate-400 font-mono">SKU-CRS-102 • Tax 5%</div>
                      </div>
                    </div>
                    <span className="font-extrabold text-white">$7.00</span>
                  </div>
                </div>

                {/* Subtotal & Split Buttons */}
                <div className="border-t border-slate-800 pt-3 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal</span>
                    <span className="font-mono text-slate-200">$11.50</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Tax (5%)</span>
                    <span className="font-mono text-slate-200">$0.58</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-white pt-1 border-t border-slate-800">
                    <span>Grand Total:</span>
                    <span className="text-indigo-400 text-lg">$12.08</span>
                  </div>
                </div>

                {/* Quick Payment Tender Buttons */}
                <div className="grid grid-cols-4 gap-2 pt-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-center font-bold text-[11px] border border-emerald-500/20">
                    Cash
                  </div>
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 text-center font-bold text-[11px] border border-indigo-500/20">
                    Card
                  </div>
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 text-center font-bold text-[11px] border border-amber-500/20">
                    Split
                  </div>
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 text-center font-bold text-[11px] border border-purple-500/20">
                    Credit
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REFERRAL PROGRAM & INCOME CALCULATOR - Animated */}
          {activeEcosystemTab === 'referral' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-emerald-950/40 rounded-3xl border border-emerald-500/20 p-6 sm:p-10 shadow-2xl shadow-emerald-500/10 backdrop-blur-xl animate-scale-in hover:border-emerald-500/40 transition-all duration-700">
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Velcora Official Promoter Network</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  Earn 20% Monthly Recurring Income by Recommending Velcora POS
                </h3>

                <p className="text-sm text-slate-300 leading-relaxed">
                  Turn your business network, social media following, or client relationships into predictable monthly revenue. As long as the stores you refer stay subscribed to Velcora, you get paid every single month.
                </p>

                <div className="space-y-3 text-xs">
                  {[
                    { icon: TrendingUp, text: <span><strong>20% Lifetime Recurring:</strong> Earn every month, not just once</span> },
                    { icon: BarChart3, text: <span><strong>Dedicated Promoter Dashboard:</strong> Real-time clicks, conversions & balances</span> },
                    { icon: Wallet, text: <span><strong>Fast Disbursements:</strong> Withdraw via PayPal, Wire Transfer or USDT Wallet</span> },
                    { icon: Users, text: <span><strong>60-Day Cookie Tracking:</strong> Reliable lead attribution</span> },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-slate-300 group transition-all duration-300 hover:translate-x-2 hover:text-white">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:animate-pulse transition-all">
                        <item.icon className="w-4 h-4" />
                      </div>
                      {item.text}
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex flex-wrap gap-4">
                  <button
                    onClick={onOpenReferral}
                    className="group px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all duration-500 hover:scale-105 hover:shadow-emerald-500/50 cursor-pointer overflow-hidden relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer pointer-events-none" />
                    <Share2 className="w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-12" />
                    <span>Join Partner Program</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-2" />
                  </button>
                </div>
              </div>

              {/* Dynamic Income Calculator Box */}
              <div className="lg:col-span-6 bg-slate-950 rounded-2xl border border-emerald-500/30 p-6 shadow-2xl space-y-6 animate-scale-in delay-200 relative overflow-hidden">
                {/* Animated background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 pointer-events-none" />
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />

                <div className="relative flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <Flame className="w-4 h-4 text-amber-400 animate-pulse" style={{ animationDuration: '2s' }} />
                    </div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Interactive Earnings Simulator</span>
                  </div>
                  <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 animate-pulse">
                    20% COMMISSION
                  </span>
                </div>

                {/* Slider: Store Count */}
                <div className="relative space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-bold">Active Stores Referred:</span>
                    <span className="text-emerald-400 font-black text-base tabular-nums transition-all duration-300">{calcStoreCount} Stores</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={calcStoreCount}
                    onChange={(e) => setCalcStoreCount(parseInt(e.target.value) || 1)}
                    className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg transition-all duration-300"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>1 store</span>
                    <span>50 stores</span>
                    <span>100 stores</span>
                  </div>
                </div>

                {/* Average Store Plan Selector */}
                <div className="relative space-y-2">
                  <span className="text-xs font-bold text-slate-400">Average Plan Subscribed:</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setCalcPlanPrice(19)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all duration-300 cursor-pointer ${
                        calcPlanPrice === 19
                          ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-105'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-emerald-500/40'
                      }`}
                    >
                      Starter ($19)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcPlanPrice(39)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all duration-300 cursor-pointer ${
                        calcPlanPrice === 39
                          ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-105'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-emerald-500/40'
                      }`}
                    >
                      Pro ($39)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcPlanPrice(99)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all duration-300 cursor-pointer ${
                        calcPlanPrice === 99
                          ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-105'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-emerald-500/40'
                      }`}
                    >
                      Enterprise ($99)
                    </button>
                  </div>
                </div>

                {/* Dynamic Calculated Output Box - Animated */}
                <div className="relative p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 text-center space-y-1.5 animate-glow-pulse overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/5 to-transparent animate-shimmer pointer-events-none" />
                  <div className="relative">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Estimated Recurring Earnings</div>
                    <div className="text-4xl font-black bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent tracking-tight">
                      ${monthlyEarnings.toLocaleString()} <span className="text-sm font-bold text-slate-300">/ month</span>
                    </div>
                    <div className="text-xs font-medium text-slate-400">
                      ≈ <strong className="text-emerald-300">${annualEarnings.toLocaleString()}</strong> per year in passive revenue
                    </div>
                  </div>
                </div>

                <button
                  onClick={onOpenReferral}
                  className="group relative w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:via-teal-500 hover:to-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/40 transition-all duration-500 hover:scale-[1.02] hover:shadow-emerald-500/50 cursor-pointer overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer pointer-events-none" />
                  <Share2 className="w-4 h-4 transition-transform duration-300 group-hover:rotate-12" />
                  <span>Claim Your Referral Link Now</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-2" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          FEATURE SHOWCASE (6 BENTO CARDS)
      ========================================================================= */}
      <section id="pos-features" className="py-20 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Next-Gen Point of Sale</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Engineered for Speed, Reliability, and Scale
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl mx-auto">
              Everything modern retailers need to operate smoothly, prevent stock loss, and automate accounting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Dynamic Feature Cards - Animated */}
            {[
              {
                icon: <Scan className="w-6 h-6" />,
                color: 'indigo',
                title: 'Sub-Second Optical Barcode OCR',
                desc: 'Scan UPC, EAN, and QR codes instantly using your device camera or plug-and-play USB/Bluetooth barcode lasers with instant inventory matching.',
                glow: 'hover:border-indigo-500/60 hover:shadow-indigo-500/20'
              },
              {
                icon: <Clock className="w-6 h-6" />,
                color: 'emerald',
                title: 'Zero-Downtime Offline Mode',
                desc: 'Never lose a sale during internet outages. Transactions are verified locally and safely synchronize with Cloud Firestore the moment internet resumes.',
                glow: 'hover:border-emerald-500/60 hover:shadow-emerald-500/20'
              },
              {
                icon: <BrainCircuitIcon />,
                color: 'purple',
                title: 'Autonomous AI Demand Forecasting',
                desc: 'Neural telemetry analyzes past sales velocity, seasonal surges, and restock intervals to automatically suggest purchase orders before you run out of stock.',
                glow: 'hover:border-purple-500/60 hover:shadow-purple-500/20'
              },
              {
                icon: <Users className="w-6 h-6" />,
                color: 'amber',
                title: 'Multi-Workstation & Staff PINs',
                desc: 'Restrict access to manager approvals, discount limits, and drawer cash counts. Connect unlimited physical cash registers with independent device tokens.',
                glow: 'hover:border-amber-500/60 hover:shadow-amber-500/20'
              },
              {
                icon: <Globe className="w-6 h-6" />,
                color: 'sky',
                title: 'Global Multi-Currency Billing',
                desc: 'Sell natively in USD, PKR, EUR, GBP, AED, or SAR with localized tax computations, custom VAT formulas, and automatic rate conversions.',
                glow: 'hover:border-sky-500/60 hover:shadow-sky-500/20'
              },
              {
                icon: <Smartphone className="w-6 h-6" />,
                color: 'rose',
                title: 'Digital Passports & E-Receipts',
                desc: 'Save paper and delight shoppers. Send clean, QR-scannable digital receipts via WhatsApp, SMS, or NFC wallet passes directly from the register.',
                glow: 'hover:border-rose-500/60 hover:shadow-rose-500/20'
              },
            ].map((card, i) => (
              <div
                key={i}
                className={`relative group p-6 rounded-3xl bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/40 border border-slate-800 overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${card.glow} animate-slide-up`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Hover glow gradient */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
                
                {/* Icon */}
                <div className={`w-12 h-12 rounded-2xl bg-${card.color}-500/10 text-${card.color}-400 flex items-center justify-center border border-${card.color}-500/20 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 animate-float`} style={{ animationDelay: `${i * 0.3}s` }}>
                  {card.icon}
                </div>
                
                <h4 className="text-lg font-black text-white mt-4 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r from-white to-slate-400 transition-all duration-300">
                  {card.title}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed mt-2 group-hover:text-slate-300 transition-colors duration-300">
                  {card.desc}
                </p>

                {/* Bottom accent line */}
                <div className={`mt-4 h-0.5 w-0 group-hover:w-full transition-all duration-500 bg-gradient-to-r from-${card.color}-500 to-transparent`} />
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* =========================================================================
          LIVE SUBSCRIPTION PRICING PLANS (DYNAMIC LIVE FIRESTORE INTEGRATION)
      ========================================================================= */}
      <section id="pricing" className="py-20 bg-slate-950/60 border-t border-slate-800/80 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-xs font-bold">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Transparent & Predictable Pricing</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Simple Plans for Stores of Every Size
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              Start with our free tier or unlock multi-terminal synchronization, higher AI token bandwidth, and priority support.
            </p>

            {/* Monthly / Annual Switcher - Animated */}
            <div className="flex items-center justify-center gap-3 pt-2 animate-slide-up">
              <span className={`text-xs font-bold transition-all duration-300 ${billingInterval === 'monthly' ? 'text-white' : 'text-slate-500 hover:text-slate-400'}`}>
                Monthly Billing
              </span>
              <button
                type="button"
                onClick={() => setBillingInterval(billingInterval === 'monthly' ? 'annual' : 'monthly')}
                className={`relative h-6 w-12 rounded-full transition-all duration-500 cursor-pointer shadow-lg ${
                  billingInterval === 'annual' ? 'bg-indigo-600 shadow-indigo-600/40' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 h-4 w-4 rounded-full transition-all duration-500 ${billingInterval === 'annual' ? 'translate-x-6 ' : ''} ${
                    billingInterval === 'annual' ? 'bg-white shadow-md shadow-indigo-400/50 scale-110' : 'bg-slate-200'
                  }`}
                />
              </button>
              <span className={`text-xs font-bold flex items-center gap-1.5 transition-all duration-300 ${billingInterval === 'annual' ? 'text-white' : 'text-slate-500'}`}>
                <span>Annual Billing</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase transition-all duration-300 ${
                  billingInterval === 'annual'
                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 shadow-lg shadow-emerald-500/20 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  Save 20%
                </span>
              </span>
            </div>
          </div>

          {/* Dynamic Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {subscriptionPlans.map((plan) => {
              const price = billingInterval === 'annual'
                ? (plan.annualPriceUSD ? Math.round(plan.annualPriceUSD / 12) : Math.round(plan.monthlyPriceUSD * 0.8))
                : plan.monthlyPriceUSD;

              return (
                <div
                  key={plan.id || plan.tier}
                  className={`relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between border transition-all duration-500 group overflow-hidden ${
                    plan.isPopular
                      ? 'bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-950 border-indigo-500 shadow-2xl shadow-indigo-500/20 scale-[1.02] hover:scale-[1.05] animate-glow-pulse'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-600 hover:scale-[1.02] hover:shadow-2xl hover:shadow-slate-800/30'
                  }`}
                >
                  {/* Animated gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                  {plan.isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 animate-pulse" style={{ animationDuration: '3s' }}>
                      ★ MOST POPULAR CHOICE
                    </div>
                  )}

                  <div className="space-y-4 relative">
                    <div>
                      <h4 className="text-xl font-black text-white flex items-center gap-2">
                        {plan.isPopular && <Star className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" style={{ animationDuration: '2s' }} />}
                        {plan.name}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{plan.tagline}</p>
                    </div>

                    <div className="py-2">
                      <div className="flex items-baseline gap-1">
                        <span className={`text-4xl font-black ${plan.isPopular ? 'bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent' : 'text-white'} tabular-nums`}>${price}</span>
                        <span className="text-xs text-slate-400 font-medium">/ month</span>
                      </div>
                      {billingInterval === 'annual' && plan.monthlyPriceUSD > 0 && (
                        <div className="text-[11px] text-emerald-400 font-semibold mt-1 flex items-center gap-1.5">
                          <Zap className="w-3 h-3 animate-pulse" />
                          Billed annually (${plan.annualPriceUSD || price * 12}/year)
                        </div>
                      )}
                    </div>

                    {/* Quota Specs */}
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1.5 group-hover:border-slate-700 transition-colors duration-300">
                      <div className="flex justify-between text-slate-300">
                        <span>Monthly AI Tokens:</span>
                        <span className="font-bold text-amber-400 tabular-nums">{(plan.tokensIncludedMonthly || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Workstations Allowed:</span>
                        <span className="font-semibold text-slate-200">{plan.maxWorkstations === 999 ? 'Unlimited' : plan.maxWorkstations}</span>
                      </div>
                    </div>

                    {/* Features List */}
                    <ul className="space-y-2 text-xs text-slate-300 pt-2">
                      {(plan.features || []).slice(0, 6).map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2 transition-all duration-200 hover:translate-x-1">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 transition-transform duration-300 group-hover:scale-125" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6 relative">
                    <button
                      onClick={onLaunchPos}
                      className={`w-full py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all duration-500 cursor-pointer relative overflow-hidden ${
                        plan.isPopular
                          ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/40 hover:shadow-indigo-500/60 hover:scale-[1.03] animate-gradient-shift'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:shadow-lg hover:shadow-slate-700/30 hover:scale-[1.03]'
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer pointer-events-none" />
                      <span>Get Started with {plan.name}</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-2" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center text-xs text-indigo-300">
            Need custom enterprise SLA, private cloud deployment, or high-volume hardware procurement? <strong className="text-white cursor-pointer underline" onClick={onLaunchPos}>Talk to our commerce team</strong>.
          </div>
        </div>
      </section>

      {/* =========================================================================
          FAQ SECTION - ENHANCED
      ========================================================================= */}
      <section id="faq" className="py-20 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="text-center space-y-3 animate-slide-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-400 border border-indigo-500/30 text-xs font-bold">
              <HelpCircle className="w-3.5 h-3.5 animate-pulse" style={{ animationDuration: '2s' }} />
              <span>Got Questions?</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className={`rounded-2xl bg-gradient-to-r from-slate-900/80 to-slate-900/60 border transition-all duration-500 overflow-hidden group ${
                  openFaqIndex === idx
                    ? 'border-indigo-500/50 shadow-2xl shadow-indigo-500/20 scale-[1.02]'
                    : 'border-slate-800 hover:border-slate-600'
                } ${!isVisible ? '' : 'animate-slide-up'}`}
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-white hover:text-indigo-400 transition-all duration-300 cursor-pointer group-hover:translate-x-1"
                >
                  <span className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 text-[10px] font-black border border-indigo-500/30 flex items-center justify-center shrink-0 group-hover:animate-pulse" style={{ animationDuration: '2s' }}>
                      {idx + 1}
                    </span>
                    <span>{faq.q}</span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-all duration-500 ${
                      openFaqIndex === idx ? 'rotate-180 text-indigo-400' : 'group-hover:scale-125'
                    }`}
                  />
                </button>
                {openFaqIndex === idx && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-indigo-500/20 pt-3 animate-slide-up">
                    <div className="w-8 h-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 mb-3 animate-pulse" style={{ animationDuration: '2s' }} />
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          FINAL CALL TO ACTION BANNER - ENHANCED
      ========================================================================= */}
      <section className="py-20 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl p-8 sm:p-12 bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 border border-indigo-500/40 shadow-2xl text-center space-y-6 relative overflow-hidden animate-scale-in">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer pointer-events-none" />
            
            <div className="relative">
              <div className="mx-auto w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-2xl shadow-indigo-500/40 animate-glow-pulse mb-6">
                <Rocket className="w-8 h-8 text-white animate-bounce" style={{ animationDuration: '2.5s' }} />
              </div>

              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight bg-gradient-to-r from-white via-indigo-100 to-purple-100 bg-clip-text text-transparent">
                Ready to Accelerate Your Store Operations?
              </h2>
              <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed mt-4">
                Join thousands of merchants running their point of sale on Velcora. Start in under two minutes with zero hardware setup.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                <button
                  onClick={onLaunchPos}
                  className="group relative w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl hover:bg-slate-100 transition-all duration-500 hover:scale-105 cursor-pointer overflow-hidden"
                >
                  <ShoppingCart className="w-4 h-4 text-slate-950 transition-transform duration-300 group-hover:rotate-12" />
                  <span>Start Free POS Now</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-2" />
                </button>

                <button
                  onClick={onOpenReferral}
                  className="group relative w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-950/80 hover:bg-slate-950 text-emerald-400 font-extrabold text-sm flex items-center justify-center gap-2 border border-emerald-500/40 transition-all duration-500 hover:scale-105 hover:shadow-emerald-500/30 cursor-pointer overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent animate-shimmer pointer-events-none" />
                  <Share2 className="w-4 h-4 text-emerald-400 transition-transform duration-300 group-hover:rotate-12" />
                  <span>Earn 20% as Partner</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FOOTER (NO SUPER ADMIN LISTED - STRICT SECURITY)
      ========================================================================= */}
      <footer className="border-t border-slate-800 bg-[#050811] py-12 relative z-10 text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black">V</div>
              <div>
                <span className="font-extrabold text-white text-sm">VELCORA POS</span>
                <p className="text-[10px] text-slate-500">Universal Commerce & Global Partner Network</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 font-semibold">
              <a href="#ecosystem" className="hover:text-white transition">Ecosystem</a>
              <a href="#pos-features" className="hover:text-white transition">POS Register</a>
              <button onClick={onOpenReferral} className="hover:text-emerald-400 transition cursor-pointer">
                Referral Partner Hub
              </button>
              <a href="#pricing" className="hover:text-white transition">Pricing</a>
              <button onClick={() => onOpenAuth('login')} className="hover:text-white transition cursor-pointer">
                Sign In
              </button>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <div>
              © {new Date().getFullYear()} Velcora POS Systems Inc. All rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <span>Security & SOC-2 Compliance</span>
              <span>•</span>
              <span>Terms of Service</span>
              <span>•</span>
              <span>Privacy Policy</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

function BrainCircuitIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5V3m0 18v-2M5 12H3m18 0h-2" />
      <circle cx="12" cy="12" r="4" />
      <path d="M18 9l2-2M4 20l2-2M18 15l2 2M4 4l2 2" />
    </svg>
  );
}
