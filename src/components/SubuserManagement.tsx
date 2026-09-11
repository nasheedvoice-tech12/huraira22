import React, { useState, useEffect, useMemo } from 'react';
import { useVelcora } from '../context/VelcoraContext';
import {
  Users, UserCheck, Shield, Key, Plus, Trash2, Edit2, Check,
  X, AlertCircle, Eye, EyeOff, Lock, Unlock, CheckCircle2,
  Sliders, UserPlus, Sparkles, HelpCircle, FileText, Search,
  Terminal, KeyRound, Activity, Monitor, Smartphone, RefreshCw,
  Copy, Filter, AlertTriangle, ArrowUpDown, ChevronRight, UserX
} from 'lucide-react';
import { SubUser, UserRole, PermissionKey, AuditLogEntry, Workstation } from '../types';
import { PERMISSION_DEFINITIONS } from '../data/mockInitialData';
import { getOrCreateDeviceId, getDeviceName } from '../lib/deviceManager';
import { resolveActivePlan, checkResourceLimit } from '../utils/planLimitsEngine';

export const SubuserManagement: React.FC = () => {
  const {
    subusers,
    addSubuser,
    updateSubuser,
    deleteSubuser,
    roles,
    addRole,
    updateRole,
    deleteRole,
    activeUser,
    setActiveUser,
    activeBusiness,
    workstations,
    authorizeWorkstation,
    revokeWorkstation,
    activeSubscription,
    subscriptionPlans,
    openCheckoutModal,
  } = useVelcora();

  // Dynamic Plan Limits Enforcer
  const currentPlan = resolveActivePlan(activeSubscription, subscriptionPlans, activeBusiness);
  const staffQuota = checkResourceLimit(currentPlan, 'maxStaff', subusers.length);
  const [quotaWarning, setQuotaWarning] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'employees' | 'roles' | 'matrix' | 'audit'>('employees');

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Subuser modal/form state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [staffId, setStaffId] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRoleId, setUserRoleId] = useState(roles[0]?.id || 'role-cashier');
  const [userPin, setUserPin] = useState('1234');
  const [userPassword, setUserPassword] = useState('Staff123!');
  const [showPassword, setShowPassword] = useState(false);
  const [userActive, setUserActive] = useState(true);

  // Admin Password Reset Modal
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<SubUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetStatusMsg, setResetStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Role builder modal/form state
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [rolePermissions, setRolePermissions] = useState<PermissionKey[]>([]);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditActionFilter, setAuditActionFilter] = useState<string>('ALL');
  const [auditStaffFilter, setAuditStaffFilter] = useState<string>('ALL');
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch Audit Logs from server / local store
  const fetchAuditLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const bizId = activeBusiness?.id || 'biz-clothing-01';
      const res = await fetch(`/api/audit-logs?businessId=${bizId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.logs && Array.isArray(data.logs)) {
          setAuditLogs(data.logs);
        }
      }
    } catch (err) {
      console.warn('Could not fetch server audit logs, using local fallback:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
    const interval = setInterval(fetchAuditLogs, 8000); // 8s polling for real-time fleet activity
    return () => clearInterval(interval);
  }, [activeBusiness?.id]);

  // Propose next sequential staff ID when role changes
  const suggestStaffId = (roleId: string) => {
    let prefix = 'STF';
    if (roleId.includes('manager') || roleId.includes('admin')) prefix = 'MGR';
    else if (roleId.includes('inventory') || roleId.includes('stock')) prefix = 'INV';
    else if (roleId.includes('accountant') || roleId.includes('finance')) prefix = 'ACC';
    else if (roleId.includes('owner')) prefix = 'OWN';

    const existingMatching = subusers
      .map(u => u.staffId || '')
      .filter(s => s.toUpperCase().startsWith(prefix));

    let maxIdx = 0;
    for (const sid of existingMatching) {
      const match = sid.match(new RegExp(`^${prefix}-(\\d+)$`, 'i'));
      if (match) {
        const idx = parseInt(match[1], 10);
        if (!isNaN(idx) && idx > maxIdx) maxIdx = idx;
      }
    }

    return `${prefix}-${String(maxIdx + 1).padStart(3, '0')}`;
  };

  // Open User Modal
  const handleOpenUserModal = (user?: SubUser) => {
    if (user) {
      setEditingUserId(user.id);
      setStaffId(user.staffId || suggestStaffId(user.roleId));
      setUserName(user.name);
      setUserEmail(user.email);
      setUserRoleId(user.roleId);
      setUserPin(user.pinCode);
      setUserPassword('');
      setUserActive(user.isActive !== false && user.status !== 'suspended');
    } else {
      if (!staffQuota.allowed) {
        setQuotaWarning(staffQuota.errorMessage || `You have reached your ${currentPlan.name} limit of ${staffQuota.limit} staff accounts. Upgrade your plan to add more.`);
        return;
      }
      setEditingUserId(null);
      const defaultRole = roles[1]?.id || roles[0]?.id || 'role-cashier';
      setUserRoleId(defaultRole);
      setStaffId(suggestStaffId(defaultRole));
      setUserName('');
      setUserEmail('');
      setUserPin(Math.floor(1000 + Math.random() * 9000).toString());
      setUserPassword('Staff123!');
      setUserActive(true);
    }
    setShowPassword(false);
    setIsUserModalOpen(true);
  };

  // Handle Save Staff Member
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;

    const matchedRole = roles.find(r => r.id === userRoleId);
    const roleNameStr = matchedRole ? matchedRole.name : 'Custom Staff';
    const finalStaffId = (staffId.trim() || suggestStaffId(userRoleId)).toUpperCase();

    if (editingUserId) {
      updateSubuser(editingUserId, {
        staffId: finalStaffId,
        name: userName.trim(),
        email: userEmail.trim(),
        roleId: userRoleId,
        roleName: roleNameStr,
        pinCode: userPin,
        isActive: userActive,
        status: userActive ? 'active' : 'suspended',
      });
    } else {
      if (!staffQuota.allowed) {
        setQuotaWarning(staffQuota.errorMessage || `You have reached your ${currentPlan.name} limit of ${staffQuota.limit} staff accounts. Upgrade your plan to add more.`);
        return;
      }
      const bizName = (activeBusiness?.name || 'velcora').toLowerCase().replace(/[^a-z0-9]/g, '');
      const newUserId = `user-${Date.now().toString().slice(-4)}`;
      const newUser: SubUser = {
        id: newUserId,
        businessId: activeBusiness?.id || 'biz-clothing-01',
        staffId: finalStaffId,
        name: userName.trim(),
        email: userEmail.trim() || `${userName.toLowerCase().replace(/\s+/g, '.')}@${bizName || 'velcora'}.com`,
        roleId: userRoleId,
        roleName: roleNameStr,
        pinCode: userPin,
        isActive: userActive,
        status: userActive ? 'active' : 'suspended',
        createdAt: new Date().toISOString(),
      };

      addSubuser(newUser);

      // Register staff password on backend server
      try {
        await fetch('/api/staff/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: activeBusiness?.id || 'biz-clothing-01',
            subUser: newUser,
            password: userPassword || 'Staff123!',
            adminStaffId: activeUser?.staffId || 'OWN-001',
            adminName: activeUser?.name || 'Store Owner',
            deviceId: getOrCreateDeviceId(),
          }),
        });
      } catch (err) {
        console.error('Server staff creation sync error:', err);
      }
    }

    setIsUserModalOpen(false);
    fetchAuditLogs();
  };

  // Open Reset Password Modal
  const handleOpenResetPasswordModal = (user: SubUser) => {
    setResetTargetUser(user);
    setNewPassword('Velcora2026!');
    setShowNewPassword(false);
    setResetStatusMsg(null);
    setIsResetPasswordModalOpen(true);
  };

  // Handle Admin Password Reset Submission
  const handleExecutePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser || !newPassword.trim()) return;

    try {
      const response = await fetch('/api/staff/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: activeBusiness?.id || 'biz-clothing-01',
          staffId: resetTargetUser.staffId || resetTargetUser.id,
          newPassword: newPassword.trim(),
          adminStaffId: activeUser?.staffId || 'OWN-001',
          adminName: activeUser?.name || 'Business Owner',
          deviceId: getOrCreateDeviceId(),
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setResetStatusMsg({ text: `Password successfully reset for ${resetTargetUser.name}!`, isError: false });
        setTimeout(() => {
          setIsResetPasswordModalOpen(false);
        }, 1200);
      } else {
        setResetStatusMsg({ text: data.error || 'Failed to update staff password.', isError: true });
      }
    } catch (err: any) {
      setResetStatusMsg({ text: err?.message || 'Server error occurred during password update.', isError: true });
    }
    fetchAuditLogs();
  };

  // Toggle Staff Active/Suspended status
  const handleToggleStaffStatus = async (user: SubUser) => {
    const nextActive = !user.isActive;
    updateSubuser(user.id, {
      isActive: nextActive,
      status: nextActive ? 'active' : 'suspended',
    });

    try {
      await fetch('/api/staff/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: activeBusiness?.id || 'biz-clothing-01',
          staffId: user.staffId || user.id,
          isActive: nextActive,
          adminStaffId: activeUser?.staffId || 'OWN-001',
          adminName: activeUser?.name || 'Business Owner',
        }),
      });
    } catch (err) {
      console.warn('Status toggle sync error:', err);
    }
    fetchAuditLogs();
  };

  // Open Role Modal
  const handleOpenRoleModal = (role?: UserRole) => {
    if (role) {
      setEditingRoleId(role.id);
      setRoleName(role.name);
      setRoleDescription(role.description);
      setRolePermissions(role.permissions);
    } else {
      setEditingRoleId(null);
      setRoleName('');
      setRoleDescription('');
      setRolePermissions(['pos:sell', 'inventory:view']);
    }
    setIsRoleModalOpen(true);
  };

  const handleTogglePermission = (perm: PermissionKey) => {
    setRolePermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) return;

    if (editingRoleId) {
      updateRole(editingRoleId, {
        name: roleName.trim(),
        description: roleDescription.trim(),
        permissions: rolePermissions,
      });
    } else {
      const newRole: UserRole = {
        id: `role-custom-${Date.now().toString().slice(-4)}`,
        name: roleName.trim(),
        description: roleDescription.trim() || 'Custom created staff role',
        permissions: rolePermissions,
        isCustom: true,
      };
      addRole(newRole);
    }
    setIsRoleModalOpen(false);
  };

  // Filtered subusers
  const filteredSubusers = useMemo(() => {
    return subusers.filter(user => {
      const matchesSearch =
        (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.staffId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = roleFilter === 'ALL' || user.roleId === roleFilter;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'active' && user.isActive) ||
        (statusFilter === 'suspended' && !user.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [subusers, searchQuery, roleFilter, statusFilter]);

  // Filtered audit logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const matchesAction = auditActionFilter === 'ALL' || log.action === auditActionFilter;
      const matchesStaff =
        auditStaffFilter === 'ALL' ||
        log.staffId?.toUpperCase() === auditStaffFilter.toUpperCase();
      return matchesAction && matchesStaff;
    });
  }, [auditLogs, auditActionFilter, auditStaffFilter]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Categories for permission definitions
  const permissionCategories: ('POS & Cashier' | 'Inventory & Stock' | 'Reports & Profit' | 'Finance & Purchasing' | 'AI & System Administration')[] = [
    'POS & Cashier',
    'Inventory & Stock',
    'Reports & Profit',
    'Finance & Purchasing',
    'AI & System Administration',
  ];

  return (
    <div id="velcora-subuser-management" className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] rounded-3xl p-6 relative overflow-hidden shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-[#0B1220] text-[#2563EB] dark:text-[#06B6D4] text-xs font-extrabold border border-slate-200 dark:border-[#1F2E4D]">
              <Shield className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#06B6D4]" />
              <span>Multi-Terminal RBAC & Staff Management</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC]">
              Staff Accounts & Security Authority
            </h1>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">
              Issue unique Staff Login IDs, configure passwords, enforce role permissions, and track real-time audit logs across 50 connected devices.
            </p>
          </div>

          {/* Quick Active User Switcher Pill */}
          <div className="bg-slate-50 dark:bg-[#0B1220] p-3 rounded-2xl border border-slate-200 dark:border-[#1F2E4D] flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-[#94A3B8]/80">Logged In On Terminal</div>
              <div className="text-xs font-extrabold text-slate-900 dark:text-[#F8FAFC] flex items-center gap-1.5 justify-end">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {activeUser.name}
              </div>
              <div className="text-[10px] text-[#2563EB] dark:text-[#06B6D4] font-mono font-bold">
                {activeUser.staffId || 'OWN-001'} • {activeUser.roleName}
              </div>
            </div>
            <select
              value={activeUser.id}
              onChange={e => {
                const target = subusers.find(u => u.id === e.target.value);
                if (target) setActiveUser(target);
              }}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-xs text-slate-900 dark:text-[#F8FAFC] font-bold focus:border-[#2563EB] focus:outline-hidden"
            >
              {subusers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.staffId || 'ID'} - {u.name} ({u.roleName})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mt-6 border-b border-slate-200 dark:border-[#1F2E4D] pb-0">
          {[
            { id: 'employees', label: 'Staff Accounts', icon: Users, count: subusers.length },
            { id: 'roles', label: 'Role Policies', icon: Shield, count: roles.length },
            { id: 'matrix', label: 'Permissions Matrix', icon: Sliders },
            { id: 'audit', label: 'Live Audit History', icon: Activity, count: auditLogs.length },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs border-b-2 transition cursor-pointer ${
                  isActive
                    ? 'border-[#2563EB] dark:border-[#06B6D4] text-[#2563EB] dark:text-[#06B6D4]'
                    : 'border-transparent text-slate-500 dark:text-[#94A3B8]/70 hover:text-[#2563EB] dark:hover:text-[#F8FAFC]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${isActive ? 'bg-[#2563EB] text-white' : 'bg-slate-100 dark:bg-[#152644] text-[#2563EB] dark:text-[#06B6D4]'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quota Exceeded Warning Banner */}
      {quotaWarning && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-4 rounded-2xl flex items-center justify-between gap-3 text-rose-800 dark:text-rose-200 text-xs font-semibold shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{quotaWarning}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openCheckoutModal('subscriptions')}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs cursor-pointer shadow-xs transition"
            >
              Upgrade Plan
            </button>
            <button onClick={() => setQuotaWarning(null)} className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 font-bold text-xs p-1">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: EMPLOYEES & STAFF ACCOUNTS */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-[#94A3B8]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by Staff ID, Name, or Email..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-xs text-slate-900 dark:text-[#F8FAFC] font-medium focus:border-[#2563EB] focus:outline-hidden"
                />
              </div>

              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-xs text-slate-900 dark:text-[#F8FAFC] font-bold focus:border-[#2563EB] focus:outline-hidden"
              >
                <option value="ALL">All Roles</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-xs text-slate-900 dark:text-[#F8FAFC] font-bold focus:border-[#2563EB] focus:outline-hidden"
              >
                <option value="ALL">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="suspended">Suspended Only</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold border ${
                staffQuota.remaining <= 0
                  ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400'
                  : 'bg-slate-100 dark:bg-[#152644] border-slate-200 dark:border-[#1F2E4D] text-slate-700 dark:text-slate-300'
              }`}>
                {subusers.length} / {staffQuota.limit} Staff ({currentPlan.name})
              </span>

              {staffQuota.remaining <= 0 ? (
                <button
                  onClick={() => openCheckoutModal('subscriptions')}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition active:scale-98 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Upgrade to Add More</span>
                </button>
              ) : (
                <button
                  onClick={() => handleOpenUserModal()}
                  className="px-4 py-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-2xs transition active:scale-98 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Staff Account</span>
                </button>
              )}
            </div>
          </div>

          {/* Staff Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubusers.map(user => {
              const matchedRole = roles.find(r => r.id === user.roleId);
              const isOwner = user.roleId === 'role-owner';
              const isCurrent = activeUser.id === user.id;
              const sId = user.staffId || 'STF-000';

              return (
                <div
                  key={user.id}
                  className={`p-5 rounded-3xl border transition relative flex flex-col justify-between ${
                    isCurrent
                      ? 'border-[#2563EB] dark:border-[#06B6D4] bg-slate-50 dark:bg-[#111C30] shadow-2xs ring-1 ring-[#2563EB]/20'
                      : 'border-slate-200 dark:border-[#1F2E4D] bg-white dark:bg-[#111C30] hover:border-slate-300 dark:hover:border-[#2A3F66] shadow-2xs'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header with Unique Staff ID Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#2563EB] flex items-center justify-center font-extrabold text-white text-sm shadow-2xs">
                          {(user?.name || 'ST').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-extrabold text-sm text-slate-900 dark:text-[#F8FAFC] flex items-center gap-1.5">
                            {user.name}
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 text-[9px] font-extrabold">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-[#94A3B8] truncate max-w-[150px]">{user.email}</div>
                        </div>
                      </div>

                      {/* Staff ID Tag */}
                      <button
                        onClick={() => copyToClipboard(sId, user.id)}
                        className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-[#2563EB] dark:text-[#06B6D4] font-mono font-extrabold text-[11px] flex items-center gap-1 hover:border-[#2563EB] transition cursor-pointer"
                        title="Click to copy Unique Staff ID"
                      >
                        <Terminal className="w-3 h-3" />
                        <span>{sId}</span>
                        {copiedId === user.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-2.5 h-2.5 opacity-60" />}
                      </button>
                    </div>

                    {/* Metadata Card */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-[#94A3B8] font-medium">Assigned Role:</span>
                        <span className="font-bold text-[#2563EB] dark:text-[#06B6D4] px-2.5 py-0.5 rounded-lg bg-white dark:bg-[#152644] border border-slate-200 dark:border-[#1F2E4D]">
                          {matchedRole?.name || user.roleName}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-[#94A3B8] font-medium">Quick-PIN:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-[#F8FAFC]">
                          •••• ({user.pinCode})
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-[#94A3B8] font-medium">Status:</span>
                        <span className={`font-bold flex items-center gap-1.5 text-[11px] ${user.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          <span className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                          {user.isActive ? 'Active (Authorized)' : 'Suspended'}
                        </span>
                      </div>
                    </div>

                    {/* Admin Action Row */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleOpenResetPasswordModal(user)}
                        className="py-1.5 px-2 bg-slate-100 dark:bg-[#0B1220] hover:bg-slate-200 dark:hover:bg-[#1E2E4A] border border-slate-200 dark:border-[#1F2E4D] text-slate-700 dark:text-[#94A3B8] rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                        title="Set or reset staff password"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#06B6D4]" />
                        <span>Reset Pass</span>
                      </button>

                      {!isOwner && (
                        <button
                          onClick={() => handleToggleStaffStatus(user)}
                          className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            user.isActive
                              ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100'
                              : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                          }`}
                        >
                          {user.isActive ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          <span>{user.isActive ? 'Suspend' : 'Activate'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-[#1F2E4D] flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenUserModal(user)}
                        className="p-1.5 text-slate-400 hover:text-[#2563EB] dark:hover:text-white rounded-lg transition cursor-pointer"
                        title="Edit Staff Member Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!isOwner && (
                        <button
                          onClick={() => deleteSubuser(user.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition cursor-pointer"
                          title="Delete Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {activeUser.id !== user.id && (
                      <button
                        onClick={() => setActiveUser(user)}
                        className="px-3 py-1 bg-slate-100 dark:bg-[#152644] hover:bg-[#2563EB] hover:text-white dark:hover:bg-[#2563EB] text-[#2563EB] dark:text-[#06B6D4] rounded-xl text-[11px] font-bold transition active:scale-98 cursor-pointer"
                      >
                        Switch To User
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredSubusers.length === 0 && (
              <div className="col-span-full p-12 text-center bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] rounded-3xl space-y-3">
                <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <h4 className="font-extrabold text-slate-700 dark:text-slate-200 text-sm">No Staff Accounts Found</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click &quot;Create Staff Account&quot; above to add cashiers, managers, or store specialists.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ROLES & POLICIES */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">System & Custom Role Policies</h2>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">Configure capabilities, profit margin visibility restrictions, and cashier limits.</p>
            </div>
            <button
              onClick={() => handleOpenRoleModal()}
              className="px-4 py-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-2xs transition active:scale-98 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Custom Role</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map(role => {
              const assignedUsersCount = subusers.filter(u => u.roleId === role.id).length;

              return (
                <div
                  key={role.id}
                  className="p-5 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] bg-white dark:bg-[#111C30] shadow-2xs hover:border-slate-300 dark:hover:border-[#2A3F66] transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-sm text-slate-900 dark:text-[#F8FAFC]">{role.name}</h3>
                          {role.isCustom ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#152644] text-[#2563EB] dark:text-[#06B6D4] border border-slate-200 dark:border-[#1F2E4D] text-[10px] font-extrabold">
                              Custom Role
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#0B1220] text-slate-600 dark:text-[#94A3B8] text-[10px] font-bold">
                              System Preset
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1 leading-relaxed font-medium">{role.description}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenRoleModal(role)}
                          className="p-1.5 text-slate-400 hover:text-[#2563EB] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1E2E4A] rounded-xl transition cursor-pointer"
                          title="Edit Role Permissions"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {role.isCustom && (
                          <button
                            onClick={() => deleteRole(role.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition cursor-pointer"
                            title="Delete Custom Role"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Permissions summary */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-500 dark:text-[#94A3B8]">Granted Capabilities:</span>
                        <span className="text-[#2563EB] dark:text-[#06B6D4] font-extrabold">{role.permissions.length} / {PERMISSION_DEFINITIONS.length}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto">
                        {role.permissions.map(perm => (
                          <span
                            key={perm}
                            className="px-2 py-0.5 rounded-lg bg-white dark:bg-[#152644] border border-slate-200 dark:border-[#1F2E4D] text-[10px] font-medium text-slate-700 dark:text-[#F8FAFC]"
                          >
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-[#1F2E4D] flex items-center justify-between text-xs">
                    <span className="text-slate-400 dark:text-[#94A3B8]/80 text-[11px] font-medium">
                      {assignedUsersCount} {assignedUsersCount === 1 ? 'staff member' : 'staff members'} assigned
                    </span>
                    <button
                      onClick={() => handleOpenRoleModal(role)}
                      className="text-xs text-[#2563EB] dark:text-[#06B6D4] hover:underline font-bold cursor-pointer"
                    >
                      Modify Permissions →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: PERMISSIONS MATRIX */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">Full Role Permission Comparison Matrix</h2>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">Inspect and verify exact operational privileges across all roles.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-[#1F2E4D] bg-white dark:bg-[#111C30] shadow-2xs overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#0B1220] text-slate-700 dark:text-[#94A3B8] border-b border-slate-200 dark:border-[#1F2E4D]">
                <tr>
                  <th className="p-3.5 font-bold min-w-[240px]">Permission Capability</th>
                  <th className="p-3.5 font-bold min-w-[120px]">Category</th>
                  {roles.map(r => (
                    <th key={r.id} className="p-3.5 font-bold text-center min-w-[120px]">
                      <div className="text-slate-900 dark:text-[#F8FAFC] truncate">{r.name}</div>
                      <div className="text-[10px] text-[#2563EB] dark:text-[#06B6D4] font-normal">({r.permissions.length} perms)</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1F2E4D] text-slate-700 dark:text-[#94A3B8]">
                {PERMISSION_DEFINITIONS.map(perm => (
                  <tr key={perm.key} className="hover:bg-slate-50 dark:hover:bg-[#152644]/50 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 dark:text-[#F8FAFC]">{perm.label}</div>
                      <div className="text-[10px] text-[#2563EB] dark:text-[#06B6D4] font-mono mt-0.5">{perm.key}</div>
                      <div className="text-[10px] text-slate-500 dark:text-[#94A3B8]/80 mt-0.5 line-clamp-1">{perm.description}</div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-[10px] font-bold text-[#2563EB] dark:text-[#06B6D4]">
                        {perm.category}
                      </span>
                    </td>
                    {roles.map(r => {
                      const has = r.permissions.includes(perm.key);
                      return (
                        <td key={r.id} className="p-3.5 text-center">
                          {has ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-[#152644] text-slate-400 dark:text-[#94A3B8]/40">
                              <X className="w-3 h-3" />
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: LIVE AUDIT & ACTIVITY LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">Multi-Computer Audit & Activity Stream</h2>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">Real-time authoritative ledger recording every login, sale, price adjustment, and security action across all connected registers.</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={auditActionFilter}
                onChange={e => setAuditActionFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-xs text-slate-900 dark:text-[#F8FAFC] font-bold focus:border-[#2563EB] focus:outline-hidden"
              >
                <option value="ALL">All Actions</option>
                <option value="LOGIN">Staff Logins</option>
                <option value="SALE_COMPLETED">Sales Completed</option>
                <option value="STOCK_ADJUSTED">Stock Adjustments</option>
                <option value="PRICE_CHANGED">Price Overrides</option>
                <option value="PASSWORD_RESET">Password Resets</option>
                <option value="SUBUSER_CREATED">Account Created</option>
                <option value="CONCURRENCY_LOCK_RESOLVED">Concurrency Locks</option>
              </select>

              <button
                onClick={fetchAuditLogs}
                disabled={isLoadingLogs}
                className="p-2 rounded-xl bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-700 dark:text-[#94A3B8] hover:text-[#2563EB] transition cursor-pointer"
                title="Refresh logs"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingLogs ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-[#1F2E4D] bg-white dark:bg-[#111C30] shadow-2xs overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-[#1F2E4D] text-xs">
              {filteredAuditLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-[#94A3B8] space-y-1">
                  <Activity className="w-8 h-8 mx-auto opacity-40 mb-2" />
                  <div className="font-bold">No activity matching filter</div>
                  <p className="text-[11px]">System events will stream here automatically.</p>
                </div>
              ) : (
                filteredAuditLogs.map(log => {
                  let badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40';
                  if (log.action === 'SALE_COMPLETED') badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40';
                  else if (log.action === 'PASSWORD_RESET' || log.action === 'LOGIN_FAILED') badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40';
                  else if (log.severity === 'security') badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40';

                  return (
                    <div key={log.id} className="p-4 hover:bg-slate-50 dark:hover:bg-[#152644]/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono font-extrabold ${badgeStyle}`}>
                            {log.action}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 dark:text-[#F8FAFC]">
                            {log.details}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-[#94A3B8] flex flex-wrap items-center gap-2 font-mono">
                            <span className="text-[#2563EB] dark:text-[#06B6D4] font-bold">
                              {log.staffName} ({log.staffId})
                            </span>
                            <span>•</span>
                            <span>{log.deviceName || 'Terminal'}</span>
                            <span>•</span>
                            <span>{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right text-[10px] text-slate-400 dark:text-[#94A3B8]/60 font-mono">
                        {log.deviceId}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}



      {/* CREATE / EDIT STAFF MEMBER MODAL */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] rounded-3xl p-6 max-w-md w-full shadow-2xl text-slate-800 dark:text-[#F8FAFC] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1F2E4D] pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-[#F8FAFC]">
                  {editingUserId ? 'Edit Staff Account' : 'Provision New Staff Account'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Assign Unique Staff ID and role credentials.</p>
              </div>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
              {/* Unique Staff ID */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 dark:text-[#94A3B8]">Unique Staff ID *</label>
                  <button
                    type="button"
                    onClick={() => setStaffId(suggestStaffId(userRoleId))}
                    className="text-[10px] text-[#2563EB] dark:text-[#06B6D4] font-bold hover:underline cursor-pointer"
                  >
                    Auto-Generate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={staffId}
                  onChange={e => setStaffId(e.target.value.toUpperCase())}
                  placeholder="e.g. STF-001, MGR-001"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-mono uppercase font-bold text-slate-900 dark:text-[#F8FAFC] focus:border-[#2563EB] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Staff Member Full Name *</label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder="e.g. Jordan Miller"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] font-medium focus:border-[#2563EB] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Assigned Role</label>
                <select
                  value={userRoleId}
                  onChange={e => {
                    setUserRoleId(e.target.value);
                    if (!editingUserId) {
                      setStaffId(suggestStaffId(e.target.value));
                    }
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] font-bold focus:border-[#2563EB] focus:outline-hidden"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.permissions.length} perms)
                    </option>
                  ))}
                </select>
              </div>

              {!editingUserId && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Assigned Login Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={userPassword}
                      onChange={e => setUserPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-[#2563EB] focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">POS 4-Digit Quick PIN</label>
                <input
                  type="text"
                  maxLength={4}
                  value={userPin}
                  onChange={e => setUserPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="1234"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-mono text-center text-sm font-bold text-slate-900 dark:text-[#F8FAFC] tracking-widest focus:border-[#2563EB] focus:outline-hidden"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-[#94A3B8]">
                  <input
                    type="checkbox"
                    checked={userActive}
                    onChange={e => setUserActive(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  <span>Authorize account for terminal sign-in</span>
                </label>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-[#0B1220] hover:bg-slate-200 dark:hover:bg-[#1E2E4A] text-slate-700 dark:text-[#94A3B8] font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-extrabold shadow-2xs transition active:scale-98 cursor-pointer"
                >
                  {editingUserId ? 'Save Changes' : 'Provision Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN PASSWORD RESET MODAL */}
      {isResetPasswordModalOpen && resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] rounded-3xl p-6 max-w-md w-full shadow-2xl text-slate-800 dark:text-[#F8FAFC] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1F2E4D] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-[#F8FAFC]">
                    Reset Staff Password
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-[#94A3B8]">
                    {resetTargetUser.name} ({resetTargetUser.staffId || 'Staff'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsResetPasswordModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetStatusMsg && (
              <div className={`p-3 rounded-xl text-xs font-bold ${
                resetStatusMsg.isError
                  ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                  : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              }`}>
                {resetStatusMsg.text}
              </div>
            )}

            <form onSubmit={handleExecutePasswordReset} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">New Password *</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-[#2563EB] focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-[11px] text-slate-500 dark:text-[#94A3B8] space-y-1">
                <div className="font-bold text-slate-700 dark:text-[#F8FAFC] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#06B6D4]" />
                  <span>Security Audit Notification</span>
                </div>
                <p>This action is executed by Admin and will immediately invalidate old sessions across all connected registers.</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-[#0B1220] hover:bg-slate-200 dark:hover:bg-[#1E2E4A] text-slate-700 dark:text-[#94A3B8] font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-extrabold shadow-2xs transition active:scale-98 cursor-pointer"
                >
                  Confirm Password Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROLE BUILDER MODAL */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl text-slate-800 dark:text-[#F8FAFC] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1F2E4D] pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-[#F8FAFC]">
                  {editingRoleId ? 'Edit Role Permissions' : 'Create Custom Staff Role'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">Configure exact privileges and access barriers for this role.</p>
              </div>
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Role Title *</label>
                  <input
                    type="text"
                    required
                    value={roleName}
                    onChange={e => setRoleName(e.target.value)}
                    placeholder="e.g. Shift Manager, Inventory Clerk"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#94A3B8]/60 font-medium focus:border-[#2563EB] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Description</label>
                  <input
                    type="text"
                    value={roleDescription}
                    onChange={e => setRoleDescription(e.target.value)}
                    placeholder="Brief summary of duties..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#94A3B8]/60 font-medium focus:border-[#2563EB] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Granular Permission Checklist by Category */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-[#94A3B8]">Select Granted Permissions ({rolePermissions.length} selected):</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRolePermissions(PERMISSION_DEFINITIONS.map(p => p.key))}
                      className="text-[11px] text-[#2563EB] dark:text-[#06B6D4] hover:underline font-bold cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300 dark:text-[#1F2E4D]">|</span>
                    <button
                      type="button"
                      onClick={() => setRolePermissions(['pos:sell'])}
                      className="text-[11px] text-slate-500 dark:text-[#94A3B8] hover:underline font-medium cursor-pointer"
                    >
                      Minimal
                    </button>
                  </div>
                </div>

                {permissionCategories.map(cat => {
                  const catPerms = PERMISSION_DEFINITIONS.filter(p => p.category === cat);
                  return (
                    <div key={cat} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] space-y-2">
                      <div className="font-extrabold text-xs text-[#2563EB] dark:text-[#06B6D4]">{cat}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {catPerms.map(perm => {
                          const isChecked = rolePermissions.includes(perm.key);
                          const isProfitRestricted = perm.key === 'reports:profit_view' || perm.key === 'inventory:view_costs';

                          return (
                            <label
                              key={perm.key}
                              className={`p-2.5 rounded-2xl border flex items-start gap-2.5 cursor-pointer transition ${
                                isChecked
                                  ? 'border-[#2563EB] dark:border-[#06B6D4] bg-slate-100 dark:bg-[#152644] text-slate-900 dark:text-[#F8FAFC]'
                                  : 'border-slate-200 dark:border-[#1F2E4D] bg-white dark:bg-[#111C30] text-slate-600 dark:text-[#94A3B8] hover:border-slate-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleTogglePermission(perm.key)}
                                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-[11px] flex items-center justify-between">
                                  <span>{perm.label}</span>
                                  {isProfitRestricted && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 font-bold">
                                      Sensitive Margin
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-[#94A3B8]/70 leading-tight mt-0.5">{perm.description}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-[#1F2E4D]">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-[#0B1220] hover:bg-slate-200 dark:hover:bg-[#1E2E4A] text-slate-700 dark:text-[#94A3B8] font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-extrabold shadow-2xs transition active:scale-98 cursor-pointer"
                >
                  Save Role Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
