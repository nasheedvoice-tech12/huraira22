import React, { useState, useEffect, useMemo } from 'react';
import { useVelcora } from '../context/VelcoraContext';
import { VelcoraWordmark } from './VelcoraWordmark';
import { UserAvatarRing } from './UserAvatarRing';
import { LivingLine } from './LivingLine';
import {
  Sparkles, Globe, ChevronDown, Plus, RefreshCw,
  ShieldCheck, Zap, SlidersHorizontal, Settings, Menu, Bell, Mic,
  Cpu, X, LogOut, Share2, Search, Radio, CheckCircle2, Store, Sun, Moon
} from 'lucide-react';
import { LocaleCode } from '../types';
import { VelcoraVoiceHudModal } from './VelcoraVoiceHudModal';
import { VelcoraNotificationsEngine } from '../utils/notificationsEngine';

interface HeaderProps {
  onOpenAuth: () => void;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAuth,
  sidebarOpen,
  onToggleSidebar,
}) => {
  const {
    activeBusiness,
    businesses,
    setActiveBusinessId,
    activeMode,
    setActiveMode,
    activeUser,
    subusers,
    setActiveUser,
    smartAlerts,
    dismissAlert,
    heldCarts,
    setCurrentModule,
    products,
    sales,
    expenses,
    customerCredits,
    purchaseOrders,
    brainMetrics,
    currency,

    activeModelId,
    aiModels,
    setIsOnboardingOpen,
    authUser,
    userProfile,
    logout,
    isOffline,
    offlineSalesQueue,
    syncOfflineSales,
    openCheckoutModal,
    activeSubscription,
    setPaymentsActiveTab,
    theme,
    toggleTheme,
  } = useVelcora();

  const [showBizMenu, setShowBizMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAlertsMenu, setShowAlertsMenu] = useState(false);
  const [showSyncMenu, setShowSyncMenu] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Dynamically compute real live system notifications
  const liveNotifications = useMemo(() => {
    return VelcoraNotificationsEngine.generateRealNotifications({
      products,
      sales,
      expenses,
      customerCredits,
      purchaseOrders,
      brainMetrics,
      currency,
    });
  }, [products, sales, expenses, customerCredits, purchaseOrders, brainMetrics, currency]);

  const unreadNotifsCount = liveNotifications.filter(n => !n.isRead).length;

  // Global Alt+V Keyboard Shortcut for Voice Pilot HUD
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        setShowVoiceModal(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const unreadAlerts = smartAlerts.filter(a => !a.read);
  const currentModel = aiModels.find(m => m.id === activeModelId) || aiModels[0];

  const handleSyncSimulation = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 600);
  };


  return (
    <header
      id="velcora-main-header"
      className="h-14 sm:h-16 flex items-center justify-between px-2 xs:px-3 sm:px-6 border-b border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-[#0B101D]/95 text-slate-900 dark:text-[#F8FAFC] shrink-0 z-30 select-none transition-colors duration-200 shadow-2xs backdrop-blur-md"
    >
      {/* Left: Sidebar Toggle + Velcora Logo & Workspace Switcher */}
      <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 shrink-0 min-w-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 shrink-0"
            title="Toggle Navigation"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        <div
          className="flex items-center gap-1 sm:gap-2.5 group cursor-pointer shrink-0"
          onClick={() => {
            setActiveMode('business');
            setCurrentModule('business_brain');
          }}
        >
          <div className="flex flex-col items-start select-none">
            <span className="font-black text-slate-900 dark:text-white tracking-tight text-base sm:text-lg">
              velcora
            </span>
            <div className="hidden sm:block mt-0.5 -ml-0.5">
              <LivingLine mode="ambient" width={80} height={8} />
            </div>
          </div>
        </div>

        {/* Business Workspace Switcher Dropdown */}
        <div className="relative ml-2 hidden md:block">
          <button
            id="header-business-switcher-btn"
            onClick={() => setShowBizMenu(!showBizMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-800 dark:text-[#F8FAFC] transition"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="truncate max-w-[130px]">{activeBusiness.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showBizMenu && (
            <div className="absolute top-full left-0 mt-2 w-64 max-w-[calc(100vw-24px)] bg-white dark:bg-[#0F1424] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-50 text-slate-900 dark:text-[#F8FAFC] backdrop-blur-xl">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5">
                Active Stores & Outlets
              </div>
              <div className="space-y-1 my-1 max-h-56 overflow-y-auto">
                {businesses.map(biz => (
                  <button
                    key={biz.id}
                    onClick={() => {
                      setActiveBusinessId(biz.id);
                      setShowBizMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-2xl text-xs font-semibold flex items-center justify-between transition ${
                      biz.id === activeBusiness.id
                        ? 'bg-primary text-white font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="truncate font-bold">{biz.name}</div>
                      <div className="text-[10px] opacity-75 capitalize">{biz.industry} • {biz.currency}</div>
                    </div>
                    {biz.id === activeBusiness.id && <div className="w-2 h-2 rounded-full bg-white" />}
                  </button>
                ))}
              </div>
              <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 space-y-1">
                <button
                  onClick={() => {
                    setShowBizMenu(false);
                    setIsOnboardingOpen(true);
                  }}
                  className="w-full text-center py-2 px-3 rounded-2xl text-xs font-bold text-primary hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create / Customize Store</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Middle: Universal Search Bar Pill */}
      <div className="hidden lg:flex items-center flex-1 max-w-md 2xl:max-w-xl mx-4">
        <div className="w-full relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 pointer-events-none stroke-[2]" />
          <input
            type="text"
            placeholder="Search products, orders, customers (Press Enter)..."
            value={globalSearch}
            onChange={e => setGlobalSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && globalSearch.trim()) {
                setCurrentModule('products');
              }
            }}
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-ring focus:border-primary transition"
          />
        </div>
      </div>

      {/* Right Controls: Mode Toggle, Mobile Simulator, Alerts, Theme, User Avatar */}
      <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2.5 md:gap-3 shrink-0">
        
        {/* Mode Switcher Pill: Dashboard vs POS Register */}
        <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl sm:rounded-2xl p-0.5 sm:p-1 border border-slate-200 dark:border-slate-800 shadow-2xs shrink-0">
          <button
            id="header-toggle-business-mode"
            onClick={() => {
              setActiveMode('business');
              setCurrentModule('business_brain');
            }}
            className={`px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap ${
              activeMode === 'business'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Dashboard
          </button>
          <button
            id="header-toggle-pos-mode"
            onClick={() => {
              setActiveMode('pos');
              setCurrentModule('pos');
            }}
            className={`px-1.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
              activeMode === 'pos'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>POS</span>
            {heldCarts.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-500 text-white font-bold">
                {heldCarts.length}
              </span>
            )}
          </button>
        </div>

        {/* Connection Status & Offline Sync Pill */}
        {(isOffline || offlineSalesQueue.length > 0) && (
          <div className="relative shrink-0">
            <button
              onClick={() => setShowSyncMenu(!showSyncMenu)}
              className={`flex items-center gap-1 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-extrabold border shadow-2xs transition active:scale-95 cursor-pointer ${
                isOffline
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-400'
                  : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-400'
              }`}
              title="View Offline Storage & Sync Queue"
            >
              {isOffline ? (
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              ) : (
                <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              )}
              <span className="hidden xs:inline">{isOffline ? 'Offline' : 'Sync'}</span>
              {offlineSalesQueue.length > 0 && (
                <span className="bg-amber-500 dark:bg-amber-600 text-white text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.2 rounded-full font-black">
                  {offlineSalesQueue.length}
                </span>
              )}
            </button>

            {showSyncMenu && (
              <div className="absolute top-full right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-24px)] bg-white dark:bg-[#0F1424] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 z-50 text-slate-900 dark:text-white space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div className="text-xs font-extrabold flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Connection & Sync Hub</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${isOffline ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'}`}>
                    {isOffline ? 'Offline Mode' : 'Online'}
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                    {isOffline 
                      ? 'You are currently disconnected from the internet. Transactions are being securely cached in browser local storage.'
                      : 'You are online. Pending cached sales can be manually synced below.'
                    }
                  </p>
                </div>

                {offlineSalesQueue.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Pending Offline Transactions
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {offlineSalesQueue.map(sale => (
                        <div key={sale.id} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] flex justify-between items-center">
                          <div>
                            <div className="font-bold">{sale.invoiceNumber}</div>
                            <div className="text-[10px] text-slate-400">
                              {sale.customerName} • {sale.items.length} items
                            </div>
                          </div>
                          <div className="font-extrabold text-slate-700 dark:text-slate-300">
                            {activeBusiness.currency || '$'}{(sale.grandTotal ?? 0).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      disabled={isOffline || isSyncing}
                      onClick={async () => {
                        setIsSyncing(true);
                        const result = await syncOfflineSales();
                        setIsSyncing(false);
                        if (result.success) {
                          alert(`Successfully synced ${result.syncedCount} sales!`);
                        } else {
                          alert(`Sync error: ${result.error}`);
                        }
                      }}
                      className="w-full py-2 px-3 rounded-2xl bg-primary hover:bg-primary-hover disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isOffline ? 'Connect to internet to Sync' : 'Sync Pending Sales Now'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-slate-400 flex flex-col items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>No offline transactions pending sync.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Active Plan / Upgrade Pill */}
        <button
          onClick={() => {
            openCheckoutModal('subscriptions');
            setPaymentsActiveTab('plans');
          }}
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-bold transition shadow-2xs shrink-0 cursor-pointer"
          title="Manage Subscription / Upgrade Plan"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
          <span className="uppercase">{activeSubscription?.tier || 'Pro Tier'}</span>
          <span className="text-[10px] text-indigo-500/80 dark:text-indigo-300 font-normal">Plan</span>
        </button>

        {/* AI Tokens Button */}
        <button
          onClick={() => {
            openCheckoutModal('tokens');
            setPaymentsActiveTab('wallet');
          }}
          className="flex items-center gap-1 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold transition shadow-2xs shrink-0 cursor-pointer"
          title="Buy AI Intelligence Tokens"
        >
          <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
          <span className="hidden md:inline">AI Tokens</span>
          <span className="text-[9px] sm:text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-300 px-1 sm:px-1.5 py-0.2 rounded-full font-mono font-bold">+Buy</span>
        </button>

        {/* Theme Toggle (Dark / Light Mode) */}
        <button
          onClick={toggleTheme}
          className="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition shrink-0 cursor-pointer"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle visual theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700" />
          )}
        </button>


        {/* Smart Alerts & Notification Bell (Dynamic Real Notifications) */}
        <div className="relative shrink-0">
          <button
            id="header-alerts-btn"
            onClick={() => setShowAlertsMenu(!showAlertsMenu)}
            className="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-4 sm:h-4 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white dark:ring-[#0B101D]">
                {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
              </span>
            )}
          </button>

          {showAlertsMenu && (
            <div className="absolute top-full right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-24px)] bg-white dark:bg-[#0F1424] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 z-50 text-slate-900 dark:text-white">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800">
                <div className="text-xs font-extrabold">Live Notifications</div>
                <span className="text-[10px] text-slate-400 font-bold">
                  {unreadNotifsCount} Unread
                </span>
              </div>
              <div className="space-y-2 my-2.5 max-h-60 overflow-y-auto">
                {liveNotifications.slice(0, 4).map(notif => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      VelcoraNotificationsEngine.markAsRead(notif.id);
                      setShowAlertsMenu(false);
                      if (notif.actionModule) {
                        setCurrentModule(notif.actionModule);
                      }
                    }}
                    className={`p-2.5 rounded-2xl border text-xs cursor-pointer transition ${
                      notif.category === 'stock'
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/40'
                        : notif.category === 'sale'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/40'
                        : notif.category === 'ai'
                        ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/40'
                        : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900 dark:text-white line-clamp-1">{notif.title}</div>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-1">{notif.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{notif.message}</p>
                  </div>
                ))}
                {liveNotifications.length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No active notifications.
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setShowAlertsMenu(false);
                  setCurrentModule('notifications');
                }}
                className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 transition text-center block cursor-pointer"
              >
                View Notifications Center
              </button>
            </div>
          )}
        </div>

        {/* User Profile Avatar with Animated Ring and Dropdown */}
        <div className="relative shrink-0">
          <button
            id="header-user-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-1 sm:gap-2 p-0.5 sm:p-1 rounded-xl sm:rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <UserAvatarRing
              photoUrl={authUser?.photoURL || userProfile?.photoURL}
              displayName={authUser?.displayName || userProfile?.displayName || activeUser?.name || 'Operator'}
              email={authUser?.email || userProfile?.email || 'operator@velcora.com'}
              isGoogle={Boolean(authUser?.providerData?.some(p => p.providerId === 'google.com'))}
              tier={userProfile?.subscriptionTier || activeBusiness?.subscriptionTier || 'plus'}
              size={30}
            />
            <div className="hidden md:block text-left">
              <div className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
                {authUser?.displayName || userProfile?.displayName || activeUser?.name || 'Operator'}
              </div>
              <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                <span>{activeUser?.roleName || 'Store Owner'}</span>
                {Boolean(authUser?.providerData?.some(p => p.providerId === 'google.com')) && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">Google</span>
                )}
              </div>
            </div>
            <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 hidden xs:block" />
          </button>

          {showUserMenu && (
            <div className="absolute top-full right-0 mt-2 w-64 max-w-[calc(100vw-24px)] bg-white dark:bg-[#0F1424] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 z-50 text-slate-900 dark:text-white space-y-2">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Active Operator
                </div>
                <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                  {authUser?.displayName || userProfile?.displayName || activeUser?.name || 'Operator'} ({activeUser?.roleName || 'Store Owner'})
                </div>
                <div className="text-[11px] text-slate-500">
                  {authUser?.email || userProfile?.email || 'operator@velcora.com'}
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-medium">Subscription:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                    {userProfile?.subscriptionTier || activeBusiness.subscriptionTier || 'PLUS'}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setIsOnboardingOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-2xl text-xs text-primary hover:bg-slate-100 dark:hover:bg-slate-800 font-bold flex items-center gap-2 transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span>Customize POS / Setup Wizard</span>
                </button>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setCurrentModule('subusers');
                  }}
                  className="w-full text-left px-3 py-2 rounded-2xl text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold flex items-center gap-2 transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  <span>Employees & Roles</span>
                </button>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setCurrentModule('settings');
                  }}
                  className="w-full text-left px-3 py-2 rounded-2xl text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold flex items-center gap-2 transition"
                >
                  <Settings className="w-3.5 h-3.5 text-primary" />
                  <span>Store Settings</span>
                </button>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setCurrentModule('referral_hub');
                  }}
                  className="w-full text-left px-3 py-2 rounded-2xl text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-bold flex items-center gap-2 transition"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Referral & Partner Hub</span>
                </button>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenAuth();
                  }}
                  className="w-full text-left px-3 py-2 rounded-2xl text-xs text-primary hover:bg-primary-light font-bold flex items-center gap-2 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Cloud Account / Switch</span>
                </button>

                <button
                  onClick={async () => {
                    setShowUserMenu(false);
                    await logout();
                  }}
                  className="w-full text-left px-3 py-2 rounded-2xl text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold flex items-center gap-2 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out / Switch User</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Voice Pilot HUD Modal */}
      <VelcoraVoiceHudModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
      />
    </header>
  );
};


