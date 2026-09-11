import React, { useState } from 'react';
import { useVelcora } from '../context/VelcoraContext';
import {
  ShieldCheck, UserCheck, Shield, KeyRound, Terminal, ArrowRight,
  Sparkles, Lock, Store, Zap, CheckCircle2, ChevronRight, AlertCircle,
  Smartphone, Monitor, RefreshCw, Layers, Award, X, Eye, EyeOff,
  Gift, Check, Building2, Users, Bot, Globe, Mail, Phone,
  BadgeCheck, Clock, Fingerprint, HelpCircle, Plus, ExternalLink, User
} from 'lucide-react';
import { VelcoraWordmark } from './VelcoraWordmark';

interface AuthPortalProps {
  onSuccess?: () => void;
  isOpenModal?: boolean;
  onClose?: () => void;
}

export const AuthPortal: React.FC<AuthPortalProps> = ({ onSuccess, isOpenModal, onClose }) => {
  const {
    loginAsOwner,
    signupAsOwner,
    loginWithGoogle,
    sendPhoneOtpCode,
    loginWithPhoneOtpCode,
    loginAsStaff,
    quickLoginAsDemo,
    activeBusiness,
  } = useVelcora();

  // Active Tab: 'owner' | 'phone' | 'staff' | 'demo'
  const [activeTab, setActiveTab] = useState<'owner' | 'phone' | 'staff' | 'demo'>('owner');

  // Owner Form State
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const [referralCode, setReferralCode] = useState('');

  // Phone Auth State
  const [countryCode, setCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('555 019 2834');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [phoneSending, setPhoneSending] = useState(false);

  // Staff Form State
  const [staffId, setStaffId] = useState('MGR-001');
  const [staffPassword, setStaffPassword] = useState('Manager123!');
  const [showStaffPassword, setShowStaffPassword] = useState(false);

  // UI Status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');



  // Combine full phone string
  const getFullPhoneNumber = () => {
    const cleanNum = phoneNumber.replace(/[^0-9]/g, '');
    const cleanCode = countryCode.trim();
    return `${cleanCode} ${cleanNum}`;
  };

  // Handle Phone OTP Request
  const handleSendPhoneOtp = async () => {
    const full = getFullPhoneNumber();
    if (phoneNumber.replace(/[^0-9]/g, '').length < 7) {
      setErrorMsg('Please enter a valid phone number with area code.');
      return;
    }
    setPhoneSending(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await sendPhoneOtpCode(full);
      if (!res.success && res.error) {
        throw new Error(res.error);
      }
      setOtpSent(true);
      setSuccessMsg(res.message || `Verification passcode sent to ${full}.`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to dispatch verification SMS code.');
    } finally {
      setPhoneSending(false);
    }
  };

  // Handle Phone OTP Verification
  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneOtp.trim()) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const full = getFullPhoneNumber();
      const res = await loginWithPhoneOtpCode(phoneOtp.trim(), full);
      if (!res.success) {
        throw new Error(res.error || 'Invalid verification code.');
      }
      setSuccessMsg('Phone authentication verified! Launching workspace with 500 AI credits...');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Verification failed. Please check the code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Owner Email/Password Submission
  const handleOwnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerEmail || !ownerPassword) {
      setErrorMsg('Please provide a valid email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (authMode === 'signup') {
        const res = await signupAsOwner(ownerEmail, ownerPassword, ownerName, referralCode);
        if (!res.success) {
          throw new Error(res.error || 'Failed to create business account.');
        }
        setSuccessMsg('Account created successfully! 500 Welcome Points credited. Launching POS Setup...');
      } else {
        const res = await loginAsOwner(ownerEmail, ownerPassword);
        if (!res.success) {
          throw new Error(res.error || 'Failed to sign in. Please verify your credentials.');
        }
        setSuccessMsg('Signed in successfully! Restoring your store workspace...');
      }
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Owner auth error:', err);
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Native Browser OAuth Popup
  const handleGoogleSubmit = async () => {
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await loginWithGoogle();
      if (!res.success) {
        throw new Error(res.error || 'Google sign-in was cancelled or failed.');
      }
      setSuccessMsg('Google Account verified! 500 AI Points unlocked.');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      setErrorMsg(err?.message || 'Failed to authenticate via Google.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Staff Login (Unique Staff ID + Password)
  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId.trim()) {
      setErrorMsg('Please enter your assigned Staff ID (e.g. MGR-001, STF-001).');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await loginAsStaff(staffId.trim(), staffPassword);
      if (!res.success) {
        throw new Error(res.error || 'Invalid Staff ID or Password. Contact your store owner.');
      }
      setSuccessMsg(`Welcome, ${res.staff?.name || 'Staff Member'} (${res.staff?.roleName || 'Staff'})!`);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Staff Login error:', err);
      setErrorMsg(err.message || 'Staff authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Quick Demo Login
  const handleDemoClick = async (role: 'owner' | 'manager' | 'cashier' | 'inventory' | 'accountant') => {
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await quickLoginAsDemo(role);
      setSuccessMsg(`Switched to Demo Workspace: ${role.toUpperCase()}`);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg('Failed to switch demo account.');
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <div className={`w-full flex flex-col bg-[#070913] text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-x-hidden ${isOpenModal ? 'rounded-3xl border border-slate-800/80 shadow-[0_24px_70px_rgba(0,0,0,0.85)] max-w-xl max-h-[92vh] overflow-y-auto' : 'min-h-screen'}`}>
      
      {/* Background Ambient Lighting & Grid */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-indigo-600/20 via-purple-600/10 to-transparent rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 right-10 w-[500px] h-[400px] bg-blue-600/10 rounded-full blur-[100px]" />
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }} 
        />
      </div>

      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-slate-800/60 bg-[#090D1A]/70 backdrop-blur-xl px-5 sm:px-8 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30 font-black text-sm">
              V
            </div>
            <VelcoraWordmark size="md" showLivingLine={true} livingLineWidth={70} />
          </div>
          <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 border-l border-slate-800 pl-3">
            Universal Multi-Device POS & AI Business Brain
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {/* Welcome Bonus Pill */}
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/15 to-indigo-500/15 border border-amber-500/30 px-3 py-1 rounded-full text-amber-300 font-bold text-[11px] shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="hidden sm:inline">500 Welcome Credits</span>
            <span className="sm:hidden">+500 PTS</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-full text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Cloud Sync</span>
          </div>

          {isOpenModal && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Main Form Centerpiece */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 z-10">
        <div className="w-full max-w-md my-auto">
          
          {/* Executive SaaS Glassmorphic Card */}
          <div className="bg-[#0B1021]/90 backdrop-blur-2xl border border-slate-800/90 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-6 sm:p-8 relative transition-all duration-300">
            
            {/* 500 Credits Promotional Banner */}
            <div className="mb-6 p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 border border-amber-500/25 flex items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
                  <Gift className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-white flex items-center gap-1.5">
                    <span>New Account Special</span>
                    <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 rounded text-[9px] font-black uppercase">500 Free PTS</span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Claim <strong className="text-amber-300 font-bold">500 AI Intelligence Credits</strong> automatically upon sign in.
                  </div>
                </div>
              </div>
            </div>

            {/* Header Title & Subtitle */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-black text-white tracking-tight">
                {activeTab === 'owner'
                  ? authMode === 'signup'
                    ? 'Start Your Business with Velcora'
                    : 'Welcome Back to Velcora'
                  : activeTab === 'phone'
                  ? 'Sign In with Mobile OTP'
                  : activeTab === 'staff'
                  ? 'Staff Terminal Sign In'
                  : 'Instant Demo Workspaces'}
              </h1>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                {activeTab === 'owner'
                  ? authMode === 'signup'
                    ? 'Setup your universal POS terminal, dynamic catalog, and AI business intelligence.'
                    : 'Sign in to access your synchronized stores, POS registers, and revenue analytics.'
                  : activeTab === 'phone'
                  ? 'Quickly authenticate using your registered mobile number and SMS passcode.'
                  : activeTab === 'staff'
                  ? 'Enter your assigned Staff ID & password to unlock this terminal session.'
                  : 'Experience the full Velcora operating suite with preloaded test data.'}
              </p>
            </div>

            {/* Segmented Tab Bar */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950/70 rounded-2xl border border-slate-800/80 mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('owner');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`py-2 px-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'owner'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Owner</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('phone');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`py-2 px-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'phone'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Phone</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('staff');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`py-2 px-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'staff'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Staff</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('demo');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`py-2 px-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'demo'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Demo</span>
              </button>
            </div>

            {/* Invisible container for phone OTP captcha */}
            <div id="recaptcha-container"></div>

            {/* Alert Messages */}
            {errorMsg && (
              <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-rose-300 text-xs font-medium flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">{errorMsg}</div>
              </div>
            )}

            {successMsg && (
              <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-emerald-300 text-xs font-medium flex items-start gap-2.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">{successMsg}</div>
              </div>
            )}

            {/* 1. OWNER / GOOGLE AUTHENTICATION VIEW */}
            {activeTab === 'owner' && (
              <div className="space-y-4">
                
                {/* Social Login: High-Conversion Google Button */}
                <button
                  type="button"
                  onClick={handleGoogleSubmit}
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs transition flex items-center justify-center gap-3 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.99] disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google Account</span>
                </button>

                {/* Subtle Divider */}
                <div className="flex items-center gap-3 my-3">
                  <div className="h-px bg-slate-800 flex-1" />
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    or with business email
                  </span>
                  <div className="h-px bg-slate-800 flex-1" />
                </div>

                {/* Email Form */}
                <form onSubmit={handleOwnerSubmit} className="space-y-3.5 text-xs">
                  {authMode === 'signup' && (
                    <div>
                      <label className="block font-bold text-slate-300 mb-1">Business Owner Name *</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={ownerName}
                          onChange={e => setOwnerName(e.target.value)}
                          placeholder="e.g. Alex Henderson"
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-white font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                        />
                        <Users className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Email Address *</label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={ownerEmail}
                        onChange={e => setOwnerEmail(e.target.value)}
                        placeholder="owner@yourstore.com"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-white font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                      />
                      <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-300">Password *</label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showPassword ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={ownerPassword}
                        onChange={e => setOwnerPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-white font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                      />
                      <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    </div>
                  </div>

                  {authMode === 'signup' && (
                    <div>
                      <label className="block font-bold text-slate-300 mb-1">Referral / Promo Code (Optional)</label>
                      <input
                        type="text"
                        value={referralCode}
                        onChange={e => setReferralCode(e.target.value)}
                        placeholder="e.g. VELCORA-PROMO-2026"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-white font-mono uppercase focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50 mt-2"
                  >
                    <span>
                      {isLoading
                        ? 'Authenticating...'
                        : authMode === 'signup'
                        ? 'Create Business Account & Claim 500 Credits'
                        : 'Sign In to Workspace'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {/* Switch between Sign In / Sign Up */}
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode(authMode === 'login' ? 'signup' : 'login');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
                    >
                      {authMode === 'login'
                        ? "Don't have an account? Start free with 500 AI credits →"
                        : 'Already registered? Sign In →'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 2. PHONE NUMBER SMS AUTHENTICATION VIEW */}
            {activeTab === 'phone' && (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 text-indigo-200 text-[11px] leading-relaxed flex items-start gap-2.5">
                  <Smartphone className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>
                    Sign in with your mobile device. We will dispatch an instant 6-digit one-time passcode via SMS.
                  </span>
                </div>

                {!otpSent ? (
                  <div className="space-y-3.5">
                    <div>
                      <label className="block font-bold text-slate-300 mb-1">Mobile Phone Number *</label>
                      <div className="flex gap-2">
                        {/* Country Code Selector */}
                        <select
                          value={countryCode}
                          onChange={e => setCountryCode(e.target.value)}
                          className="w-24 px-2 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white font-mono text-xs focus:border-indigo-500 focus:outline-none shrink-0"
                        >
                          <option value="+1">🇺🇸 +1</option>
                          <option value="+44">🇬🇧 +44</option>
                          <option value="+92">🇵🇰 +92</option>
                          <option value="+971">🇦🇪 +971</option>
                          <option value="+966">🇸🇦 +966</option>
                          <option value="+49">🇩🇪 +49</option>
                          <option value="+33">🇫🇷 +33</option>
                          <option value="+91">🇮🇳 +91</option>
                          <option value="+61">🇦🇺 +61</option>
                        </select>

                        {/* Phone Number Input */}
                        <div className="relative flex-1">
                          <input
                            type="tel"
                            required
                            value={phoneNumber}
                            onChange={e => setPhoneNumber(e.target.value)}
                            placeholder="555 019 2834"
                            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-white font-mono font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                          />
                          <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSendPhoneOtp}
                      disabled={phoneSending}
                      className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                    >
                      {phoneSending ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Smartphone className="w-4 h-4" />
                      )}
                      <span>{phoneSending ? 'Dispatching SMS Passcode...' : 'Send SMS Verification Code'}</span>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleVerifyPhoneOtp} className="space-y-3.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-300">Enter 6-Digit SMS Code *</label>
                        <button
                          type="button"
                          onClick={() => setOtpSent(false)}
                          className="text-[10px] text-indigo-400 hover:underline font-bold"
                        >
                          Change Number
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={phoneOtp}
                        onChange={e => setPhoneOtp(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="123456"
                        className="w-full px-3.5 py-3 text-center tracking-[0.5em] text-lg rounded-xl bg-slate-950/80 border border-indigo-500/50 text-white font-mono font-black focus:border-indigo-500 focus:outline-none"
                        autoFocus
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>{isLoading ? 'Verifying...' : 'Verify Code & Sign In'}</span>
                    </button>

                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={handleSendPhoneOtp}
                        disabled={phoneSending}
                        className="text-[11px] font-bold text-slate-400 hover:text-white transition cursor-pointer"
                      >
                        {phoneSending ? 'Resending...' : "Didn't receive SMS code? Resend Code"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* 3. STAFF / MANAGER TERMINAL VIEW */}
            {activeTab === 'staff' && (
              <form onSubmit={handleStaffSubmit} className="space-y-4 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-300">Staff ID *</label>
                    <span className="text-[10px] text-cyan-400 font-mono">Assigned by Store Owner</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={staffId}
                      onChange={e => setStaffId(e.target.value)}
                      placeholder="MGR-001"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-white font-mono uppercase font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                    />
                    <Terminal className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-300">Staff Password / PIN *</label>
                    <button
                      type="button"
                      onClick={() => setShowStaffPassword(!showStaffPassword)}
                      className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                    >
                      {showStaffPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showStaffPassword ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showStaffPassword ? 'text' : 'password'}
                      required
                      value={staffPassword}
                      onChange={e => setStaffPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                    />
                    <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  </div>
                </div>

                {/* Quick Staff Presets */}
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Quick Terminal Presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'MGR-001', name: 'Manager', pass: 'Manager123!' },
                      { id: 'STF-001', name: 'Cashier', pass: 'Staff123!' },
                      { id: 'INV-001', name: 'Inventory', pass: 'Inventory123!' },
                      { id: 'ACC-001', name: 'Accountant', pass: 'Accountant123!' },
                    ].map(demo => (
                      <button
                        key={demo.id}
                        type="button"
                        onClick={() => {
                          setStaffId(demo.id);
                          setStaffPassword(demo.pass);
                          setErrorMsg('');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition border cursor-pointer ${
                          staffId === demo.id
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {demo.id} ({demo.name})
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  <span>{isLoading ? 'Authorizing...' : 'Unlock Terminal Session'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* 4. DEMO ACCOUNTS VIEW */}
            {activeTab === 'demo' && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-400 text-xs mb-2 leading-relaxed">
                  Select a pre-configured role to immediately explore Velcora POS with mock inventory, orders, and real AI capabilities:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleDemoClick('owner')}
                    disabled={isLoading}
                    className="p-3 rounded-2xl bg-slate-950/60 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/50 text-left transition group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-white text-xs group-hover:text-indigo-400 transition">
                        Store Owner
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 font-mono font-bold">
                        Full Access + AI
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Access all products, pricing, staff management, and business brain.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDemoClick('manager')}
                    disabled={isLoading}
                    className="p-3 rounded-2xl bg-slate-950/60 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/50 text-left transition group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-white text-xs group-hover:text-indigo-400 transition">
                        Store Manager
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-900/60 text-cyan-300 font-mono font-bold">
                        Operations
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Manage daily orders, approve refunds, and view live sales metrics.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDemoClick('cashier')}
                    disabled={isLoading}
                    className="p-3 rounded-2xl bg-slate-950/60 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/50 text-left transition group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-white text-xs group-hover:text-indigo-400 transition">
                        Lead Cashier
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 font-mono font-bold">
                        POS Only
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      High-speed barcode scanner checkout, hold carts, and cash register.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDemoClick('inventory')}
                    disabled={isLoading}
                    className="p-3 rounded-2xl bg-slate-950/60 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/50 text-left transition group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-white text-xs group-hover:text-indigo-400 transition">
                        Inventory Specialist
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-900/60 text-amber-300 font-mono font-bold">
                        Stock & POs
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Perform stocktakes, manage suppliers, and monitor low-stock alerts.
                    </p>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Trust & Security Footnote */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3.5 text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              256-Bit Cloud Security
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Zero-Lag Offline Resilience
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-cyan-400" />
              Multi-Device Mutex
            </span>
          </div>
        </div>
      </main>


    </div>
  );

  if (isOpenModal !== undefined) {
    if (!isOpenModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
        <div className="relative w-full max-w-lg max-h-[95vh] overflow-y-auto rounded-3xl shadow-2xl">
          {content}
        </div>
      </div>
    );
  }

  return content;
};
