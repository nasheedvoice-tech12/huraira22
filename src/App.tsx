import React, { useState, useEffect } from 'react';
import { TranslationProvider, useTranslation } from './context/TranslationContext';
import { VelcoraProvider, useVelcora } from './context/VelcoraContext';
import { Header } from './components/Header';
import { PosBillingScreen } from './components/PosBillingScreen';
import { BusinessBrainView } from './components/BusinessBrainView';
import { AskVelcoraChat } from './components/AskVelcoraChat';
import { AiRouterView } from './components/AiRouterView';
import { ProductCatalog } from './components/ProductCatalog';
import { InventoryManagement } from './components/InventoryManagement';
import { CustomerAndLoyalty } from './components/CustomerAndLoyalty';
import { PurchasesAndSuppliers } from './components/PurchasesAndSuppliers';
import { SalesAndOrders } from './components/SalesAndOrders';
import { FinancialManagement } from './components/FinancialManagement';
import { ReportsSuite } from './components/ReportsSuite';
import { OnlineStoreBeta } from './components/OnlineStoreBeta';
import { SubuserManagement } from './components/SubuserManagement';
import { CloudAndSettings } from './components/CloudAndSettings';
import { PromotionsDiscounts } from './components/PromotionsDiscounts';
import { PaymentRecordsView } from './components/PaymentRecordsView';
import { TaxManagementView } from './components/TaxManagementView';
import { NotificationsCenter } from './components/NotificationsCenter';
import { HelpSupportView } from './components/HelpSupportView';
import { ReferralPartnerDashboard } from './components/ReferralPartnerDashboard';
import { MasterCheckoutModal } from './components/MasterCheckoutModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthPortal } from './components/AuthPortal';
import { FounderAdminPanel } from './components/FounderAdminPanel';
import { OnboardingWizardModal } from './components/OnboardingWizardModal';
import { FloatingAiAssistant } from './components/FloatingAiAssistant';
import { VelcoraMascot } from './components/VelcoraMascot';
import { DigitalReceiptView } from './components/DigitalReceiptView';
import { LivingLine } from './components/LivingLine';
import { VelcoraLandingPage } from './components/VelcoraLandingPage';
import { VELCORA_COLOR_PALETTES } from './constants/themeColors';
import { trackFeatureUsage, updateUserHeartbeat } from './lib/analyticsEngine';
import {
  BrainCircuit, Sparkles, Cpu, Tag, Package,
  Users, Truck, FileText, DollarSign, BarChart3, ShoppingCart, ShoppingBag,
  Palette, Settings, ShieldCheck, ShieldAlert, Percent, CreditCard, Receipt, Bell, HelpCircle, X, ChevronRight, Share2, Lock, RotateCcw, MessageSquare
} from 'lucide-react';
import { SystemModuleKey } from './types';

const AccessRestrictedView: React.FC<{ moduleName: string; onGoHome: () => void }> = ({ moduleName, onGoHome }) => {
  const { activeUser } = useVelcora();
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white dark:bg-[#0B101D] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-lg mx-auto my-12 shadow-xl">
      <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 border border-amber-500/20 shadow-lg">
        <Lock className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
        Access Restricted
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
        Your role (<span className="font-semibold text-primary">{activeUser?.roleName || 'Staff Member'}</span>, ID: <span className="font-mono text-slate-700 dark:text-slate-300">{activeUser?.staffId || activeUser?.id}</span>) does not have permission to access <strong className="text-slate-800 dark:text-slate-200">{moduleName}</strong>.
      </p>
      <button
        onClick={onGoHome}
        className="px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-2xl hover:bg-primary/90 shadow-md shadow-primary/20 transition-all"
      >
        Return to POS / Dashboard
      </button>
    </div>
  );
};

const VelcoraAppContent: React.FC = () => {
  const {
    currentModule,
    setCurrentModule,
    activeMode,
    activeBusiness,
    brainHealth,
    isOnboardingOpen,
    setIsOnboardingOpen,
    hasCompletedOnboarding,
    activeUser,
    isAuthenticated,
    hasPermission,
    authLoading,
    primaryColor,
    theme,
    quickLoginAsDemo,
  } = useVelcora();
  const { t, locale, setLocale } = useTranslation();

  // Public visitor view state ('landing' | 'auth' | 'referral')
  const [publicView, setPublicView] = useState<'landing' | 'auth' | 'referral'>(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (search.includes('auth=true') || hash === '#login' || hash === '#signup') return 'auth';
      if (search.includes('ref=') || search.includes('referral=true') || hash === '#referral') return 'referral';
    }
    return 'landing';
  });

  const activePalette = VELCORA_COLOR_PALETTES.find(p => p.hex.toLowerCase() === (primaryColor || '#5B5CE2').toLowerCase()) || VELCORA_COLOR_PALETTES[0];

  // Dynamic theme calculation
  const isDarkTheme = theme === 'dark';

  // Sync language from cloud business profile on login
  useEffect(() => {
    if (activeBusiness?.language && activeBusiness.language !== locale) {
      setLocale(activeBusiness.language as any);
    }
  }, [activeBusiness?.language]);

  // Real-time telemetry: track feature module navigation
  useEffect(() => {
    if (currentModule) {
      trackFeatureUsage(currentModule, `User opened ${currentModule} module`);
    }
  }, [currentModule]);

  // Real-time telemetry: heartbeat updater
  useEffect(() => {
    if (activeUser?.id) {
      updateUserHeartbeat(activeUser.id, activeUser.email || undefined, activeBusiness?.id);
      const interval = setInterval(() => {
        updateUserHeartbeat(activeUser.id, activeUser.email || undefined, activeBusiness?.id);
      }, 3 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [activeUser?.id, activeUser?.email, activeBusiness?.id]);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Check for scannable digital receipt query parameters
  const [receiptParams, setReceiptParams] = useState<{ b: string; s: string } | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const b = params.get('b');
    const s = params.get('s');
    if (b && s) {
      return { b, s };
    }
    return null;
  });

  // Auto-collapse sidebar on very small screens initially
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (receiptParams) {
    return (
      <DigitalReceiptView 
        businessId={receiptParams.b} 
        saleId={receiptParams.s} 
        onBack={isAuthenticated ? () => {
          const url = new URL(window.location.href);
          url.searchParams.delete('b');
          url.searchParams.delete('s');
          window.history.replaceState({}, '', url.toString());
          setReceiptParams(null);
        } : undefined}
      />
    );
  }

  // Check for Super Admin route /admin or ?admin=true or #admin
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      return path === '/admin' || path.startsWith('/admin/') || search.includes('admin=true') || hash === '#admin';
    }
    return false;
  });

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      setIsAdminRoute(path === '/admin' || path.startsWith('/admin/') || search.includes('admin=true') || hash === '#admin');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Standalone Super Admin Portal Route (/admin)
  if (isAdminRoute) {
    return (
      <div className={`h-screen w-full overflow-y-auto bg-[#F8FAFC] dark:bg-[#070A14] text-slate-800 dark:text-white`}>
        <FounderAdminPanel
          isStandalone={true}
          onBackToStore={() => {
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/');
            }
            setIsAdminRoute(false);
          }}
        />
      </div>
    );
  }

  // Auth Guard: If not authenticated, render the dedicated AuthPortal
  if (authLoading) {
    return (
      <div className={`h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-[#070A14] text-slate-800 dark:text-white`}>
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <VelcoraMascot size={64} sparkles={true} />
          <div className="text-center">
            <h1 className={`text-xl font-black tracking-tight text-slate-900 dark:text-white`}>VELCORA POS</h1>
            <p className={`text-xs mt-1 text-slate-500 dark:text-slate-400`}>Restoring verified terminal session...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (publicView === 'auth') {
      return (
        <div className="min-h-screen w-full relative">
          <button
            onClick={() => setPublicView('landing')}
            className="fixed top-4 left-4 z-50 px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-bold flex items-center gap-1.5 backdrop-blur-md transition cursor-pointer shadow-xl"
          >
            <span>← Back to Website</span>
          </button>
          <AuthPortal />
        </div>
      );
    }

    if (publicView === 'referral') {
      return (
        <div className={`min-h-screen w-full bg-[#F8FAFC] dark:bg-[#070A14] text-slate-800 dark:text-white p-4 sm:p-6 overflow-y-auto`}>
          <div className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
            <button
              onClick={() => setPublicView('landing')}
              className="px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-bold flex items-center gap-1.5 backdrop-blur-md transition cursor-pointer shadow-xl"
            >
              <span>← Back to Website</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                Velcora Partner Promoter Network (20% Lifetime)
              </span>
            </div>
          </div>
          <ReferralPartnerDashboard />
        </div>
      );
    }

    return (
      <VelcoraLandingPage
        onLaunchPos={() => setPublicView('auth')}
        onOpenAuth={(mode) => setPublicView('auth')}
        onOpenReferral={() => setPublicView('referral')}
        onQuickDemo={() => quickLoginAsDemo('owner')}
      />
    );
  }

  // REQUIRED NEW USER FLOW:
  // For a completely new user who has not completed initial POS/business customization:
  // Sign Up / Login -> Business Setup / Universal POS Customization -> Configure -> Initialize -> Dashboard + POS
  if (!hasCompletedOnboarding) {
    return (
      <div className={`h-screen w-full flex items-center justify-center p-4 bg-[#F8FAFC] dark:bg-[#070A14]`}>
        <OnboardingWizardModal
          isOpen={true}
          isInitialSetup={true}
          onClose={() => {}}
        />
      </div>
    );
  }

  const navigationGroups: {
    title: string;
    items: { key: SystemModuleKey | 'settings' | 'subusers' | 'help' | 'notifications'; label: string; icon: any; badge?: string }[];
  }[] = [
    {
      title: 'Core Commerce',
      items: [
        { key: 'business_brain', label: 'Dashboard', icon: BrainCircuit },
        { key: 'pos', label: 'POS Register', icon: ShoppingCart },
        { key: 'products', label: 'Products & Catalog', icon: Tag },
        { key: 'inventory', label: 'Inventory & Stock', icon: Package },
        { key: 'sales_orders', label: 'Sales & Orders', icon: FileText },
        { key: 'customers', label: 'Customers & Loyalty', icon: Users },
      ],
    },
    {
      title: 'Operations & Finance',
      items: [
        { key: 'expenses', label: 'Expenses & Finance', icon: DollarSign },
        { key: 'purchases', label: 'Purchases & Suppliers', icon: Truck },
        { key: 'promotions', label: 'Promotions & Discounts', icon: Percent },
        { key: 'financial_reports', label: 'Reports & Analytics', icon: BarChart3 },
        { key: 'subusers', label: 'Staff & Roles', icon: ShieldCheck },
      ],
    },
    {
      title: 'Intelligence & AI',
      items: [
        { key: 'ask_velcora', label: 'Ask Velcora AI', icon: Sparkles, badge: 'AI' },
        { key: 'ai_router', label: 'Ecosystem', icon: Cpu },
      ],
    },
    {
      title: 'System & Billing',
      items: [
        { key: 'payments', label: 'Payments & Ledger', icon: DollarSign },
        { key: 'notifications', label: 'Notifications', icon: Bell },
        { key: 'settings', label: 'Store Settings', icon: Settings },
        { key: 'help', label: 'Help & Shortcuts', icon: HelpCircle },
      ],
    },
  ];

  const handleSelectModule = (key: SystemModuleKey | 'settings' | 'subusers' | 'help' | 'notifications') => {
    setCurrentModule(key as SystemModuleKey);
    setMobileDrawerOpen(false);
  };

  const renderActiveModule = () => {
    switch (currentModule) {
      case 'pos':
        return <PosBillingScreen />;
      case 'business_brain':
        return <BusinessBrainView />;
      case 'ask_velcora':
        return (
          <div className="flex-1 flex flex-col h-full w-full max-w-7xl 2xl:max-w-[1720px] mx-auto min-h-0">
            <AskVelcoraChat />
          </div>
        );
      case 'ai_router':
        return (
          <div className="w-full max-w-7xl 2xl:max-w-[1720px] mx-auto">
            <AiRouterView />
          </div>
        );
      case 'products':
      case 'variants':
        return (
          <div className="w-full max-w-7xl 2xl:max-w-[1720px] mx-auto">
            <ProductCatalog />
          </div>
        );
      case 'inventory':
      case 'barcodes':
      case 'batch_tracking':
      case 'serial_tracking':
        return (
          <div className="w-full max-w-7xl 2xl:max-w-[1720px] mx-auto">
            <InventoryManagement />
          </div>
        );
      case 'customers':
      case 'loyalty':
        return (
          <div className="w-full max-w-7xl 2xl:max-w-[1720px] mx-auto">
            <CustomerAndLoyalty />
          </div>
        );
      case 'promotions':
        return (
          <div className="w-full max-w-7xl 2xl:max-w-[1720px] mx-auto">
            <PromotionsDiscounts />
          </div>
        );
      case 'payments':
        return (
          <div className="w-full max-w-7xl 2xl:max-w-[1720px] mx-auto">
            <PaymentRecordsView />
          </div>
        );
      case 'taxes':
        return (
          <div className="w-full max-w-7xl 2xl:max-w-[1720px] mx-auto">
            <TaxManagementView />
          </div>
        );
      case 'notifications':
        return (
          <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto">
            <NotificationsCenter />
          </div>
        );
      case 'help':
        return (
          <div className="w-full max-w-7xl 2xl:max-w-[1720px] mx-auto">
            <HelpSupportView />
          </div>
        );
      case 'purchases':
      case 'suppliers':
        return (
          <div className="w-full max-w-7xl 2xl:max-w-[1720px] mx-auto">
            <PurchasesAndSuppliers />
          </div>
        );
      case 'sales_orders':
      case 'estimates':
      case 'credit_notes':
      case 'delivery_notes':
        return (
          <div className="w-full max-w-7xl 2xl:max-w-[1720px] mx-auto">
            <SalesAndOrders />
          </div>
        );
      case 'expenses':
      case 'other_income':
      case 'commissions':
      case 'budgets':
        return (
          <div className="w-full max-w-7xl 2xl:max-w-[1720px] mx-auto">
            <FinancialManagement />
          </div>
        );
      case 'financial_reports':
      case 'custom_reports':
        return (
          <div className="w-full max-w-7xl 2xl:max-w-[1720px] mx-auto">
            <ReportsSuite />
          </div>
        );
      case 'online_store':
        return (
          <div className="w-full max-w-7xl 2xl:max-w-[1720px] mx-auto">
            <OnlineStoreBeta />
          </div>
        );
      case 'subusers':
        if (!hasPermission('employees:manage') && activeUser?.roleId !== 'role-owner' && activeUser?.roleId !== 'role-admin') {
          return <AccessRestrictedView moduleName="Staff & Roles Management" onGoHome={() => setCurrentModule('business_brain')} />;
        }
        return (
          <div className="w-full max-w-7xl 2xl:max-w-[1720px] mx-auto">
            <SubuserManagement />
          </div>
        );
      case 'referral_hub':
        return (
          <div className="w-full max-w-7xl 2xl:max-w-[1720px] mx-auto">
            <ReferralPartnerDashboard />
          </div>
        );
      case 'employees':
      case 'settings':
        if (!hasPermission('settings:manage') && activeUser?.roleId !== 'role-owner' && activeUser?.roleId !== 'role-admin') {
          return <AccessRestrictedView moduleName="Business Settings" onGoHome={() => setCurrentModule('business_brain')} />;
        }
        return (
          <div className="w-full max-w-7xl 2xl:max-w-[1720px] mx-auto">
            <CloudAndSettings />
          </div>
        );
      default:
        return (
          <div className="w-full max-w-7xl 2xl:max-w-[1720px] mx-auto">
            <CloudAndSettings />
          </div>
        );
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-[#F8FAFC] dark:bg-[#070A14] font-sans text-slate-900 dark:text-[#F8FAFC] overflow-hidden selection:bg-primary/20 selection:text-primary transition-colors duration-200">
      {/* Velcora Master Header */}
      <Header
        onOpenAuth={() => setShowAuthModal(true)}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => {
          if (window.innerWidth < 768) {
            setMobileDrawerOpen(!mobileDrawerOpen);
          } else {
            setSidebarOpen(!sidebarOpen);
          }
        }}
      />

      {/* Main Workspace Frame */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Navigation Drawer Overlay (for phones) */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-40 md:hidden flex">
            <div
              className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <div className={`relative w-72 max-w-[80vw] bg-white dark:bg-[#0F1424] text-slate-800 dark:text-white border-slate-200 dark:border-slate-800 border-r h-full flex flex-col p-4 z-50 overflow-y-auto shadow-2xl backdrop-blur-xl`}>
              <div className={`flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3`}>
                <div className="flex items-center gap-2">
                  <VelcoraMascot size={28} sparkles={false} />
                  <span className={`text-sm font-extrabold lowercase text-slate-900 dark:text-white`}>
                    velcora
                  </span>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className={`p-1 rounded-xl ${isDarkTheme ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 flex-1">
                {navigationGroups.map((group, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      {group.title}
                    </div>
                    {group.items.map(item => {
                      const Icon = item.icon;
                      const isActive = currentModule === item.key;
                      return (
                        <button
                          key={item.key}
                          onClick={() => handleSelectModule(item.key)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-xs font-semibold text-left transition-all ${
                            isActive
                              ? 'text-white shadow-md'
                              : isDarkTheme
                              ? 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                          style={isActive ? { backgroundColor: activePalette.hex } : {}}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`} />
                          <span className="truncate flex-1">{item.label}</span>
                          {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Dynamic Colorful Business & User Info (Mobile) */}
              <div className={`mt-auto pt-3 border-t border-slate-200 dark:border-slate-800/80`}>
                <div 
                  className="p-3.5 rounded-2xl border flex flex-col gap-2 text-left relative overflow-hidden transition-all duration-300 shadow-md group"
                  style={{
                    background: isDarkTheme 
                      ? `linear-gradient(135deg, ${activePalette.hex}22 0%, #0E1528 60%, ${activePalette.hex}15 100%)`
                      : `linear-gradient(135deg, ${activePalette.hex}18 0%, #FFFFFF 60%, ${activePalette.hex}10 100%)`,
                    borderColor: `${activePalette.hex}40`,
                    boxShadow: `0 4px 20px -2px ${activePalette.hex}25`,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-8 h-8 rounded-xl flex items-center justify-center p-1 shadow-sm shrink-0 border transition-transform duration-300 group-hover:scale-105"
                      style={{
                        backgroundColor: isDarkTheme ? '#0F172A' : '#FFFFFF',
                        borderColor: `${activePalette.hex}50`,
                        boxShadow: `0 0 10px ${activePalette.hex}30`,
                      }}
                    >
                      <VelcoraMascot size={20} sparkles={true} className="shrink-0" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1" style={{ color: activePalette.hex }}>
                        <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: activePalette.hex }} />
                        <span>ACTIVE OUTLET</span>
                      </span>
                      <h4 className="text-xs font-black truncate text-slate-900 dark:text-white leading-tight">
                        {activeBusiness?.name || 'VELCORA POS'}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 dark:border-slate-800/80 text-[11px]">
                    <span className="text-slate-600 dark:text-slate-300 font-medium truncate">
                      {activeUser?.name || 'Store Owner'}
                    </span>
                    <span 
                      className="px-2 py-0.5 rounded-full text-[9px] font-extrabold capitalize shrink-0"
                      style={{
                        backgroundColor: activePalette.lightBg,
                        color: activePalette.hex,
                      }}
                    >
                      {activeUser?.roleName || 'Owner'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Collapsible Navigation Sidebar (Matches Velcora Navy Theme) */}
        <nav
          className={`hidden md:flex ${
            sidebarOpen ? 'w-64' : 'w-16'
          } shrink-0 border-r ${
            isDarkTheme ? 'border-slate-800 bg-[#0F1424] text-white' : 'border-slate-200 bg-white text-slate-800'
          } p-3 flex-col gap-1 transition-all duration-200 overflow-y-auto overflow-x-hidden select-none z-20`}
        >
          <div className="space-y-3 flex-1 mt-1">
            {navigationGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-0.5">
                {sidebarOpen && (
                  <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    {group.title}
                  </div>
                )}
                {group.items.map(item => {
                  const Icon = item.icon;
                  const isActive = currentModule === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setCurrentModule(item.key as SystemModuleKey)}
                      title={item.label}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-2xl transition-all text-xs font-bold text-left ${
                        isActive
                          ? 'text-white shadow-md'
                          : isDarkTheme
                          ? 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                      style={isActive ? { backgroundColor: activePalette.hex } : {}}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`} />
                      {sidebarOpen && (
                        <div className="flex items-center justify-between flex-1 min-w-0">
                          <span className="truncate">{item.label}</span>
                          {isActive ? (
                            <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-white/80' : ''}`} />
                          ) : item.badge ? (
                            <span 
                              className="text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider"
                              style={{
                                backgroundColor: activePalette.lightBg,
                                color: activePalette.hex,
                              }}
                            >
                              {item.badge}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Dynamic Colorful Business & User Info (Desktop) */}
          {sidebarOpen && (
            <div className={`mt-auto pt-3 border-t border-slate-200 dark:border-slate-800/80`}>
              <div 
                className="p-3.5 rounded-2xl border flex flex-col gap-2 text-left relative overflow-hidden transition-all duration-300 shadow-md group"
                style={{
                  background: isDarkTheme 
                    ? `linear-gradient(135deg, ${activePalette.hex}22 0%, #0E1528 60%, ${activePalette.hex}15 100%)`
                    : `linear-gradient(135deg, ${activePalette.hex}18 0%, #FFFFFF 60%, ${activePalette.hex}10 100%)`,
                  borderColor: `${activePalette.hex}40`,
                  boxShadow: `0 4px 20px -2px ${activePalette.hex}25`,
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div 
                    className="w-8 h-8 rounded-xl flex items-center justify-center p-1 shadow-sm shrink-0 border transition-transform duration-300 group-hover:scale-105"
                    style={{
                      backgroundColor: isDarkTheme ? '#0F172A' : '#FFFFFF',
                      borderColor: `${activePalette.hex}50`,
                      boxShadow: `0 0 10px ${activePalette.hex}30`,
                    }}
                  >
                    <VelcoraMascot size={20} sparkles={true} className="shrink-0" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1" style={{ color: activePalette.hex }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: activePalette.hex }} />
                      <span>ACTIVE OUTLET</span>
                    </span>
                    <h4 className="text-xs font-black truncate text-slate-900 dark:text-white leading-tight">
                      {activeBusiness?.name || 'VELCORA POS'}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 dark:border-slate-800/80 text-[11px]">
                  <span className="text-slate-600 dark:text-slate-300 font-medium truncate">
                    {activeUser?.name || 'Store Owner'}
                  </span>
                  <span 
                    className="px-2 py-0.5 rounded-full text-[9px] font-extrabold capitalize shrink-0"
                    style={{
                      backgroundColor: activePalette.lightBg,
                      color: activePalette.hex,
                    }}
                  >
                    {activeUser?.roleName || 'Owner'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Dynamic Center Stage */}
        <main className={`flex-1 ${
          currentModule === 'ask_velcora'
            ? 'overflow-hidden p-0 sm:p-4 md:p-6 lg:p-6 2xl:p-8 flex flex-col min-h-0'
            : 'overflow-y-auto p-3.5 sm:p-5 lg:p-6 2xl:p-8'
        } bg-[#F8FAFC] dark:bg-[#070A14] text-slate-900 dark:text-[#F8FAFC] transition-colors duration-200`}>
          <ErrorBoundary
            resetKey={currentModule}
            onNavigateHome={() => setCurrentModule('business_brain')}
            onOpenHelp={() => setCurrentModule('help')}
          >
            {renderActiveModule()}
          </ErrorBoundary>
        </main>
      </div>

      {/* Minimalist Status Bar */}
      <footer className="h-7 bg-white dark:bg-[#0B101D] border-t border-slate-200 dark:border-slate-800/80 px-4 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 shrink-0 select-none transition-colors duration-200">
        <div className="flex items-center gap-2.5">
          <span className="font-bold text-slate-900 dark:text-[#F8FAFC] truncate max-w-[160px] sm:max-w-none">
            {activeBusiness?.name || 'Velcora POS'}
          </span>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
          <span className="hidden sm:inline">{activeUser?.name || 'Operator'}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Cloud Sync Active
          </span>
        </div>
      </footer>

      {/* Persistent Floating Ask Velcora AI Assistant */}
      <FloatingAiAssistant />

      {/* Interactive Onboarding Wizard Modal */}
      <OnboardingWizardModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />

      {/* Master Payment & Token Checkout Modal */}
      <MasterCheckoutModal />

      <AuthPortal
        isOpenModal={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <TranslationProvider>
    <VelcoraProvider>
      <VelcoraAppContent />
    </VelcoraProvider>
    </TranslationProvider>
  );
}

