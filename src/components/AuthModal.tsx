import React, { useState } from 'react';
import { useVelcora } from '../context/VelcoraContext';
import {
  ShieldCheck, X, ArrowRight, UserCheck, Shield, KeyRound, Building2, Terminal, Sparkles
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    loginAsOwner,
    signupAsOwner,
    loginWithGoogle,
    loginAsStaff,
    activeBusiness,
  } = useVelcora();
  
  // 'staff' | 'owner'
  const [loginRoleType, setLoginRoleType] = useState<'owner' | 'staff'>('owner');

  // Staff Login fields
  const [staffId, setStaffId] = useState('MGR-001');
  const [staffPassword, setStaffPassword] = useState('Manager123!');

  // Owner Login / Signup fields
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  // Handle Staff Login (Unique Staff ID + Password)
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId.trim()) {
      setErrorMsg('Please enter your unique Staff ID (e.g. MGR-001, STF-001).');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await loginAsStaff(staffId.trim(), staffPassword);
      if (!res.success) {
        throw new Error(res.error || 'Invalid Staff ID or Password.');
      }
      setSuccessMsg(`Welcome, ${res.staff?.name || 'Staff Member'} (${res.staff?.roleName || 'Staff'})!`);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      console.error('Staff Login Error:', err);
      setErrorMsg(err?.message || 'Staff authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Owner Auth (Email & Password)
  const handleOwnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter a valid business email address and password.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (authMode === 'login') {
        const res = await loginAsOwner(email, password);
        if (!res.success) throw new Error(res.error || 'Failed to sign in.');
        setSuccessMsg('Signed in successfully! Restoring workspace...');
      } else {
        const res = await signupAsOwner(email, password, name, referralCode);
        if (!res.success) throw new Error(res.error || 'Failed to create business account.');
        setSuccessMsg('Account created successfully! Launching setup...');
      }
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      console.error('Owner Auth Error:', err);
      setErrorMsg(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await loginWithGoogle();
      if (!res.success) {
        throw new Error(res.error || 'Google authentication failed.');
      }
      setSuccessMsg('Google Account verified! Restoring workspace...');
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      console.error('Google Sign-In Exception:', err);
      setErrorMsg(err?.message || 'Failed to authenticate with Google Account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#111C30] rounded-3xl max-w-md w-full p-6 border border-[#1F2E4D] shadow-2xl space-y-5 text-[#F8FAFC]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1F2E4D]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#2563EB] text-[#F8FAFC] flex items-center justify-center shadow-md shadow-[#2563EB]/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#F8FAFC]">Velcora Terminal Access</h3>
              <p className="text-[11px] text-[#94A3B8] font-medium">Multi-Device Cloud POS & Workspace</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-[#94A3B8] hover:text-[#F8FAFC] transition rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Role Type Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-[#0B1220] p-1.5 rounded-2xl border border-[#1F2E4D]">
          <button
            type="button"
            onClick={() => {
              setLoginRoleType('owner');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              loginRoleType === 'owner'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Business Owner</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginRoleType('staff');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              loginRoleType === 'staff'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Staff / Manager</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs font-medium">
            {successMsg}
          </div>
        )}

        {/* OWNER / ADMIN LOGIN FORM */}
        {loginRoleType === 'owner' && (
          <div className="space-y-4">
            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0B1220] hover:bg-slate-800 border border-[#1F2E4D] text-white font-bold text-xs transition flex items-center justify-center gap-2.5 cursor-pointer active:scale-98 disabled:opacity-50"
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

            <div className="flex items-center gap-3 my-1">
              <div className="h-px bg-[#1F2E4D] flex-1" />
              <span className="text-[10px] font-bold text-[#94A3B8] uppercase">Or email</span>
              <div className="h-px bg-[#1F2E4D] flex-1" />
            </div>

            <form onSubmit={handleOwnerSubmit} className="space-y-3.5 text-xs">
              {authMode === 'signup' && (
                <div>
                  <label className="block font-bold text-[#94A3B8] mb-1">Business Owner Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1220] border border-[#1F2E4D] text-[#F8FAFC] font-medium focus:border-[#2563EB] focus:outline-hidden"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-[#94A3B8] mb-1">Master Account Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="owner@company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1220] border border-[#1F2E4D] text-[#F8FAFC] font-medium focus:border-[#2563EB] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-[#94A3B8] mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1220] border border-[#1F2E4D] text-[#F8FAFC] focus:border-[#2563EB] focus:outline-hidden"
                />
              </div>

              {authMode === 'signup' && (
                <div>
                  <label className="block font-bold text-[#94A3B8] mb-1">Referral / Promo Code</label>
                  <input
                    type="text"
                    value={referralCode}
                    onChange={e => setReferralCode(e.target.value)}
                    placeholder="e.g. VELCORA-PROMO-2026"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1220] border border-[#1F2E4D] text-[#F8FAFC] font-mono focus:border-[#2563EB] focus:outline-hidden"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-[#F8FAFC] font-extrabold text-xs shadow-md transition flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer disabled:opacity-50"
              >
                <span>{isLoading ? 'Processing...' : authMode === 'signup' ? 'Create Business Master Account' : 'Sign In as Business Owner'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'signup' : 'login');
                    setErrorMsg('');
                  }}
                  className="text-[11px] font-bold text-[#06B6D4] hover:underline transition cursor-pointer"
                >
                  {authMode === 'login' ? "Don't have an owner account? Create One" : 'Already registered? Owner Sign In'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STAFF LOGIN FORM */}
        {loginRoleType === 'staff' && (
          <form onSubmit={handleStaffLogin} className="space-y-3.5 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-[#94A3B8]">Unique Staff / Manager ID *</label>
                <span className="text-[10px] text-[#06B6D4] font-mono">e.g. MGR-001, STF-001</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={staffId}
                  onChange={e => setStaffId(e.target.value)}
                  placeholder="MGR-001"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1220] border border-[#1F2E4D] text-[#F8FAFC] font-mono uppercase font-bold focus:border-[#2563EB] focus:outline-hidden"
                />
                <Terminal className="w-4 h-4 absolute right-3 top-3 text-[#94A3B8]/60" />
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#94A3B8] mb-1">Assigned Password *</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={staffPassword}
                  onChange={e => setStaffPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1220] border border-[#1F2E4D] text-[#F8FAFC] focus:border-[#2563EB] focus:outline-hidden"
                />
                <KeyRound className="w-4 h-4 absolute right-3 top-3 text-[#94A3B8]/60" />
              </div>
            </div>

            {/* Quick Demo Staff Credential Selector */}
            <div className="p-3 rounded-2xl bg-[#0B1220] border border-[#1F2E4D] space-y-2">
              <span className="text-[10px] font-bold text-[#94A3B8] uppercase block">Quick Switch Credentials:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'MGR-001', name: 'Store Manager', pass: 'Manager123!' },
                  { id: 'STF-001', name: 'Lead Cashier', pass: 'Staff123!' },
                  { id: 'STF-002', name: 'Sales Assoc', pass: 'Staff123!' },
                  { id: 'INV-001', name: 'Inventory Specialist', pass: 'Inventory123!' },
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
                        ? 'bg-[#2563EB] border-[#2563EB] text-white'
                        : 'bg-[#111C30] border-[#1F2E4D] text-[#94A3B8] hover:text-white'
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
              className="w-full py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-[#F8FAFC] font-extrabold text-xs shadow-md transition flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? 'Authenticating Staff...' : 'Authorize Terminal & Sign In'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <div className="text-center pt-1">
              <p className="text-[11px] text-[#94A3B8]/70">
                Staff IDs and passwords are issued by the Business Owner. No owner credentials required.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

