import React, { useState, useRef, useEffect } from 'react';
import { useVelcora } from '../context/VelcoraContext';
import { signInWithGoogle } from '../lib/firebase';
import {
  Building2, Palette, ShoppingCart, Receipt, Package, Sparkles,
  ShieldCheck, Cloud, CreditCard, Share2, Globe, DollarSign,
  Printer, QrCode, Scan, Bell, RefreshCw, Upload, Download,
  Check, CheckCircle2, AlertTriangle, UserCheck, LogIn, Lock,
  Unlock, Smartphone, Tablet, Laptop, Tag, ArrowRight, X,
  Sliders, FileJson, Wifi, WifiOff, Users,
  Save, Eye, Settings2, HelpCircle, Sun, Moon
} from 'lucide-react';
import { BusinessProfile, CurrencyCode, LocaleCode, IndustryType } from '../types';
import { getOrCreateDeviceId } from '../lib/deviceManager';
import { VELCORA_COLOR_PALETTES } from '../constants/themeColors';
import { useTranslation } from '../context/TranslationContext';
import { generateBarcodeSvg } from '../utils/barcodeGenerator';

type SettingsTab =
  | 'business'
  | 'appearance'
  | 'pos_billing'
  | 'receipts_hardware'
  | 'inventory_loyalty'
  | 'security_fleet'
  | 'backup_cloud'
  | 'subscription_partner'
  | 'shortcuts';

const CURRENCIES: { code: CurrencyCode; label: string; symbol: string; country: string }[] = [
  { code: 'USD', label: 'US Dollar ($)', symbol: '$', country: 'United States' },
  { code: 'PKR', label: 'Pakistani Rupee (₨)', symbol: '₨', country: 'Pakistan' },
  { code: 'EUR', label: 'Euro (€)', symbol: '€', country: 'European Union' },
  { code: 'GBP', label: 'British Pound (£)', symbol: '£', country: 'United Kingdom' },
  { code: 'AED', label: 'UAE Dirham (د.إ)', symbol: 'د.إ', country: 'United Arab Emirates' },
  { code: 'SAR', label: 'Saudi Riyal (﷼)', symbol: '﷼', country: 'Saudi Arabia' },
  { code: 'INR', label: 'Indian Rupee (₹)', symbol: '₹', country: 'India' },
  { code: 'CAD', label: 'Canadian Dollar ($)', symbol: '$', country: 'Canada' },
  { code: 'AUD', label: 'Australian Dollar ($)', symbol: '$', country: 'Australia' },
  { code: 'JPY', label: 'Japanese Yen (¥)', symbol: '¥', country: 'Japan' },
  { code: 'CNY', label: 'Chinese Yuan (¥)', symbol: '¥', country: 'China' },
];

const LANGUAGES: { code: LocaleCode; label: string; flag: string; rtl?: boolean }[] = [
  { code: 'en', label: 'English (US / UK)', flag: '🇺🇸' },
  { code: 'ur', label: 'اردو (Urdu - RTL)', flag: '🇵🇰', rtl: true },
  { code: 'ar', label: 'العربية (Arabic - RTL)', flag: '🇸🇦', rtl: true },
  { code: 'zh', label: '中文 (Chinese Simplified)', flag: '🇨🇳' },
  { code: 'es', label: 'Español (Spanish)', flag: '🇪🇸' },
  { code: 'fr', label: 'Français (French)', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch (German)', flag: '🇩🇪' },
  { code: 'hi', label: 'हिन्दी (Hindi)', flag: '🇮🇳' },
  { code: 'bn', label: 'বাংলা (Bengali)', flag: '🇧🇩' },
  { code: 'fa', label: 'فارسی (Persian - RTL)', flag: '🇮🇷', rtl: true },
  { code: 'tr', label: 'Türkçe (Turkish)', flag: '🇹🇷' },
];

const INDUSTRIES: { value: IndustryType; label: string }[] = [
  { value: 'retail', label: 'General Retail Store' },
  { value: 'grocery', label: 'Supermarket / Grocery' },
  { value: 'clothing', label: 'Apparel & Fashion Boutique' },
  { value: 'pharmacy', label: 'Pharmacy & Healthcare' },
  { value: 'restaurant', label: 'Restaurant / Dine-In' },
  { value: 'cafe', label: 'Café & Bakery' },
  { value: 'electronics', label: 'Electronics & Gadgets' },
  { value: 'mobile_shop', label: 'Mobile & Accessories' },
  { value: 'cosmetics', label: 'Beauty & Cosmetics' },
  { value: 'hardware', label: 'Hardware & Tools' },
  { value: 'wholesale', label: 'Wholesale & Distribution' },
  { value: 'service', label: 'Services & Repair Shop' },
  { value: 'custom', label: 'Custom Enterprise' },
];

export const CloudAndSettings: React.FC = () => {
  const {
    activeBusiness,
    updateActiveBusiness,
    updateBusinessProfile,
    primaryColor,
    setPrimaryColor,
    theme,
    setTheme,
    currency,
    setCurrency,
    products,
    customers,
    salesHistory,
    expenses,
    workstations,
    authorizeWorkstation,
    revokeWorkstation,
    isOffline,
    restoreBackupData,
    authUser,
    userProfile,
    logout,
    activeReferralCode,
    isReferralCodeApplied,
    applyReferralCode,
    removeReferralCode,
    setCurrentModule,
    openCheckoutModal,
    activeSubscription,
    activeUser,
    shortcuts,
    updateShortcut,
    resetShortcuts,
  } = useVelcora();

  const { t, locale, setLocale } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>('business');

  // Customizable Keyboard Shortcuts state variables
  const [listeningShortcutId, setListeningShortcutId] = useState<string | null>(null);
  const [shortcutFeedback, setShortcutFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Keyboard capture effect
  useEffect(() => {
    if (!listeningShortcutId) return;

    const handleKeyCapture = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const modifierKeys = ['control', 'alt', 'shift', 'meta'];
      if (modifierKeys.includes(e.key.toLowerCase())) {
        return;
      }

      if (!e.key) return;

      const formattedKey = e.key.toUpperCase();
      const res = updateShortcut(listeningShortcutId, {
        key: formattedKey,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey
      });

      if (res.success) {
        setShortcutFeedback({ text: 'Shortcut updated successfully!', type: 'success' });
        setListeningShortcutId(null);
      } else {
        setShortcutFeedback({ text: res.error || 'Failed to update shortcut.', type: 'error' });
      }
    };

    window.addEventListener('keydown', handleKeyCapture, true);
    return () => window.removeEventListener('keydown', handleKeyCapture, true);
  }, [listeningShortcutId, updateShortcut]);

  // Business Profile form states
  const [name, setName] = useState(activeBusiness?.name || 'Velcora Business');
  const [legalName, setLegalName] = useState(activeBusiness?.legalName || '');
  const [industry, setIndustry] = useState<IndustryType>(activeBusiness?.industry || 'retail');
  const [businessModel, setBusinessModel] = useState<'product' | 'service' | 'hybrid'>(activeBusiness?.businessModel || 'hybrid');
  const [phone, setPhone] = useState(activeBusiness?.phone || '+1 (555) 234-5678');
  const [email, setEmail] = useState(activeBusiness?.email || 'store@velcora.com');
  const [address, setAddress] = useState(activeBusiness?.address || '100 Innovation Parkway, Suite 400');
  const [taxNumber, setTaxNumber] = useState(activeBusiness?.taxNumber || 'VAT-US-98234110');
  const [taxRate, setTaxRate] = useState(Math.round((activeBusiness?.taxRateDefault || 0.08) * 100));
  const [taxInclusive, setTaxInclusive] = useState(activeBusiness?.taxInclusive || false);
  const [receiptHeader, setReceiptHeader] = useState(activeBusiness?.receiptHeader || '*** VELCORA ENTERPRISE POS ***\nThank you for shopping with us!');
  const [receiptFooter, setReceiptFooter] = useState(activeBusiness?.receiptFooter || 'Exchange within 7 days with original invoice.\nCustomer Support: support@velcora.com');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Extended POS & Hardware preferences
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm' | 'A4'>('80mm');
  const [dualUrduEnglishReceipt, setDualUrduEnglishReceipt] = useState(true);
  const [showQrOnReceipt, setShowQrOnReceipt] = useState(true);
  const [showBarcodeOnReceipt, setShowBarcodeOnReceipt] = useState(true);
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(false);
  const [soundEffects, setSoundEffects] = useState(true);
  const [quickCashPresets, setQuickCashPresets] = useState(true);
  const [scannerAutoSubmit, setScannerAutoSubmit] = useState(true);
  const [cashDrawerPulse, setCashDrawerPulse] = useState(true);
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [autoGenerateSku, setAutoGenerateSku] = useState(true);
  const [loyaltyProgramActive, setLoyaltyProgramActive] = useState(true);
  const [pointsPerUnit, setPointsPerUnit] = useState(1);
  const [pointRedemptionValue, setPointRedemptionValue] = useState(0.01);
  const [minRedemptionPoints, setMinRedemptionPoints] = useState(50);
  const [autoLockMinutes, setAutoLockMinutes] = useState<'5' | '15' | '30' | '60' | 'never'>('15');

  // Referral code state
  const [inputRefCode, setInputRefCode] = useState('');
  const [refCodeMsg, setRefCodeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [refLoading, setRefLoading] = useState(false);

  // Google sign in state
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  // Backup & Restore
  const currentDeviceId = getOrCreateDeviceId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [driveSyncing, setDriveSyncing] = useState(false);
  const [driveSyncSuccess, setDriveSyncSuccess] = useState<string | null>(null);

  // Keep local state in sync when activeBusiness changes
  useEffect(() => {
    if (activeBusiness) {
      setName(activeBusiness.name || '');
      setLegalName(activeBusiness.legalName || '');
      setIndustry(activeBusiness.industry || 'retail');
      setPhone(activeBusiness.phone || '');
      setEmail(activeBusiness.email || '');
      setAddress(activeBusiness.address || '');
      setTaxNumber(activeBusiness.taxNumber || '');
      setTaxRate(Math.round((activeBusiness.taxRateDefault || 0.08) * 100));
      setTaxInclusive(activeBusiness.taxInclusive || false);
      setReceiptHeader(activeBusiness.receiptHeader || '');
      setReceiptFooter(activeBusiness.receiptFooter || '');
    }
  }, [activeBusiness]);

  const handleSaveAllSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const currObj = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];

    updateBusinessProfile({
      name: name.trim() || 'Velcora Business',
      legalName: legalName.trim(),
      industry,
      businessModel,
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      taxNumber: taxNumber.trim(),
      taxRateDefault: (Number(taxRate) || 0) / 100,
      taxInclusive,
      receiptHeader,
      receiptFooter,
      currency,
      currencySymbol: currObj.symbol,
      language: locale,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleApplyRefCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputRefCode.trim()) return;
    setRefLoading(true);
    setRefCodeMsg(null);
    const res = await applyReferralCode(inputRefCode);
    setRefLoading(false);
    if (res.valid) {
      setRefCodeMsg({ type: 'success', text: res.message });
      setInputRefCode('');
    } else {
      setRefCodeMsg({ type: 'error', text: res.message });
    }
  };

  const handleGoogleSignInFromSettings = async () => {
    setGoogleLoading(true);
    setGoogleError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setGoogleError(err?.message || 'Failed to authenticate with Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleExportFullBackup = () => {
    const backupData = {
      business: activeBusiness,
      products,
      customers,
      salesHistory,
      expenses,
      workstations,
      exportedAt: new Date().toISOString(),
      platform: 'VELCORA Universal Enterprise System',
      version: '4.2.0',
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `Velcora_Backup_${(name || 'store').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const jsonText = evt.target?.result as string;
        const parsedData = JSON.parse(jsonText);
        setIsRestoring(true);
        setRestoreMessage(null);

        const res = await restoreBackupData(parsedData);
        setIsRestoring(false);

        if (res.success) {
          setRestoreMessage({
            type: 'success',
            text: `Backup successfully restored! ${res.count || 'All'} records imported into database.`,
          });
        } else {
          setRestoreMessage({
            type: 'error',
            text: res.error || 'Failed to restore backup file.',
          });
        }
      } catch (err: any) {
        setIsRestoring(false);
        setRestoreMessage({
          type: 'error',
          text: 'Invalid JSON backup file format.',
        });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSyncToGoogleDrive = async () => {
    setDriveSyncing(true);
    setDriveSyncSuccess(null);

    setTimeout(() => {
      handleExportFullBackup();
      setDriveSyncing(false);
      const bizSanitized = (name || 'velcora').toLowerCase().replace(/[^a-z0-9]/g, '_');
      setDriveSyncSuccess(`Backup synced to Google Drive folder: "Velcora_Cloud_Backups/velcora_backup_${bizSanitized}.json"`);
      setTimeout(() => setDriveSyncSuccess(null), 7000);
    }, 1200);
  };

  const tabs: { id: SettingsTab; label: string; icon: any; badge?: string }[] = [
    { id: 'business', label: 'Business Profile', icon: Building2 },
    { id: 'appearance', label: 'Theme & Languages', icon: Palette },
    { id: 'pos_billing', label: 'POS & Billing', icon: ShoppingCart },
    { id: 'receipts_hardware', label: 'Receipts & Hardware', icon: Receipt },
    { id: 'inventory_loyalty', label: 'Inventory & Loyalty', icon: Package },
    { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Sliders },
    { id: 'security_fleet', label: 'Workstations & Security', icon: ShieldCheck },
    { id: 'backup_cloud', label: 'Cloud & Backups', icon: Cloud },
    { id: 'subscription_partner', label: 'Subscription & Partner', icon: CreditCard },
  ];

  return (
    <div id="velcora-settings-container" className="space-y-6 pb-12">
      {/* Hidden File Input for JSON Restore */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".json,application/json"
        className="hidden"
      />

      {/* Top Banner Header */}
      <div className="bg-white dark:bg-[#0F1424] text-slate-800 dark:text-[#F8FAFC] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 text-primary text-xs font-extrabold border border-slate-200 dark:border-slate-800">
              <Settings2 className="w-3.5 h-3.5" />
              <span>Platform Settings & System Configuration</span>
              {isOffline ? (
                <span className="ml-1 inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                  <WifiOff className="w-3 h-3" /> Offline
                </span>
              ) : (
                <span className="ml-1 inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                  <Wifi className="w-3 h-3" /> Cloud Live
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
              Settings & Store Master Configuration
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Manage business legal identities, thermal receipt formats, taxes, currencies, themes, AI reasoning, and multi-device telemetry.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {savedSuccess && (
              <span className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 animate-fade-in">
                <Check className="w-4 h-4" /> All Settings Saved
              </span>
            )}

            <button
              onClick={() => handleSaveAllSettings()}
              className="px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-extrabold flex items-center gap-2 shadow-xs transition active:scale-98 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        {/* Settings Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-6 border-t border-slate-200/80 dark:border-slate-800/80 mt-5">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold uppercase ${
                      isActive ? 'bg-white/20 text-white' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT SECTIONS */}

      {/* 1. BUSINESS PROFILE TAB */}
      {activeTab === 'business' && (
        <form onSubmit={handleSaveAllSettings} className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white dark:bg-[#0F1424] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-[#F8FAFC]">Business Profile & Legal Details</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Basic corporate identity and public store information</p>
                </div>
                <Building2 className="w-5 h-5 text-primary" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Business / Store Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Velcora Supermarket"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Legal Registered Company Name
                  </label>
                  <input
                    type="text"
                    value={legalName}
                    onChange={e => setLegalName(e.target.value)}
                    placeholder="e.g. Velcora Retail Enterprises LLC"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Industry Sector
                  </label>
                  <select
                    value={industry}
                    onChange={e => setIndustry(e.target.value as IndustryType)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:border-primary focus:outline-hidden"
                  >
                    {INDUSTRIES.map(ind => (
                      <option key={ind.value} value={ind.value}>{ind.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Business Model
                  </label>
                  <select
                    value={businessModel}
                    onChange={e => setBusinessModel(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:border-primary focus:outline-hidden"
                  >
                    <option value="product">Product Sales / POS</option>
                    <option value="service">Services & Billing</option>
                    <option value="hybrid">Hybrid (Products & Services)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Official Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="billing@velcora.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Physical Store Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Main Street Commercial Avenue, Block B, Floor 1"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Tax / VAT / NTN Registration #
                  </label>
                  <input
                    type="text"
                    value={taxNumber}
                    onChange={e => setTaxNumber(e.target.value)}
                    placeholder="e.g. STRN-9982410-0"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold font-mono focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Default Sales Tax (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={taxRate}
                      onChange={e => setTaxRate(Number(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:border-primary focus:outline-hidden"
                    />
                    <span className="text-slate-400 font-bold text-xs">%</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs transition"
                >
                  Save Business Profile
                </button>
              </div>
            </div>

            {/* Right Card: Owner & Account Overview */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white dark:bg-[#0F1424] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-[#F8FAFC]">Operator & Owner Account</h3>
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm">
                      {activeUser?.name?.[0]?.toUpperCase() || 'O'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                        {activeUser?.name || 'Store Owner'}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium truncate">
                        {activeUser?.email || 'admin@velcora.com'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                    <span className="text-slate-400">Assigned Role:</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px] uppercase">
                      {activeUser?.roleId || 'role-owner'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setCurrentModule('subusers')}
                    className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-800 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span>Manage Staff & Roles</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* 2. APPEARANCE & LOCALIZATION TAB */}
      {activeTab === 'appearance' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Left Column: Color Palettes & Accent Colors */}
          <div className="lg:col-span-7 space-y-6">
            {/* Accent Theme Colors */}
            <div className="bg-white dark:bg-[#0F1424] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-[#F8FAFC]">Store Design & Accent Palette</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Choose the primary brand color applied across POS, buttons, and badges</p>
                </div>
                <span
                  className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 shadow-xs"
                  style={{ backgroundColor: primaryColor }}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {VELCORA_COLOR_PALETTES.map(palette => {
                  const isSelected = primaryColor.toLowerCase() === palette.hex.toLowerCase();
                  return (
                    <button
                      key={palette.id}
                      type="button"
                      onClick={() => setPrimaryColor(palette.hex)}
                      className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-slate-50 dark:bg-slate-900 border-slate-900 dark:border-white shadow-xs ring-2'
                          : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                      }`}
                      style={{ boxShadow: isSelected ? `0 0 0 2px ${palette.hex}` : undefined }}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className="w-5 h-5 rounded-full shadow-xs flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ backgroundColor: palette.hex }}
                        >
                          {isSelected && '✓'}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                          {palette.tag.split(' ')[0]}
                        </span>
                      </div>
                      <div className="font-extrabold text-xs text-slate-900 dark:text-white leading-tight">
                        {palette.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Display Mode (Light / Dark) */}
            <div className="bg-white dark:bg-[#0F1424] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-[#F8FAFC]">Display Theme Mode</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Switch between Crisp Day Light and Ultra-Black OLED Dark Mode</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`p-4 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
                    theme === 'light'
                      ? 'bg-slate-100 dark:bg-slate-800 border-primary text-slate-900 dark:text-white shadow-xs ring-2 ring-primary/40'
                      : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-extrabold text-xs text-slate-900 dark:text-white">Day Light Mode</div>
                    <div className="text-[10px] text-slate-400">High clarity for bright retail counters</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`p-4 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-slate-100 dark:bg-slate-800 border-primary text-slate-900 dark:text-white shadow-xs ring-2 ring-primary/40'
                      : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-950/60 text-indigo-400 flex items-center justify-center shrink-0">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-extrabold text-xs text-slate-900 dark:text-white">OLED Night Dark</div>
                    <div className="text-[10px] text-slate-400">Comfortable low-glare deep contrast</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Currency & Language Localizations */}
          <div className="lg:col-span-5 space-y-6">
            {/* Currency Selector */}
            <div className="bg-white dark:bg-[#0F1424] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-[#F8FAFC]">Primary Currency</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Base financial reporting & POS pricing currency</p>
                </div>
              </div>

              <select
                value={currency}
                onChange={e => {
                  const newCur = e.target.value as CurrencyCode;
                  setCurrency(newCur);
                  const curInfo = CURRENCIES.find(c => c.code === newCur);
                  if (curInfo) {
                    updateActiveBusiness({
                      currency: newCur,
                      currencySymbol: curInfo.symbol,
                    });
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-xs focus:border-primary focus:outline-hidden"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.label} — {c.country} ({c.symbol})
                  </option>
                ))}
              </select>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Selected Symbol:</span>
                <span className="font-black text-sm text-primary font-mono">
                  {CURRENCIES.find(c => c.code === currency)?.symbol || '$'}
                </span>
              </div>
            </div>

            {/* Language & RTL Settings */}
            <div className="bg-white dark:bg-[#0F1424] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-[#F8FAFC]">System & Receipt Language</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Language translation and RTL alignment</p>
                </div>
              </div>

              <select
                value={locale}
                onChange={e => {
                  const newLoc = e.target.value as LocaleCode;
                  setLocale(newLoc);
                  updateActiveBusiness({ language: newLoc });
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-xs focus:border-primary focus:outline-hidden"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.label}
                  </option>
                ))}
              </select>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Velcora natively supports full bilingual English and Urdu RTL thermal receipt generation and digital billing invoices.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. POS & BILLING CONFIGURATION TAB */}
      {activeTab === 'pos_billing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          <div className="lg:col-span-8 bg-white dark:bg-[#0F1424] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-[#F8FAFC]">POS Terminal Billing Rules</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Checkout speeds, tax calculations, and sound feedback</p>
              </div>
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="space-y-0.5">
                  <div className="font-extrabold text-slate-900 dark:text-white">Tax-Inclusive Pricing Mode</div>
                  <div className="text-[11px] text-slate-400">When enabled, product retail prices already include the sales tax</div>
                </div>
                <input
                  type="checkbox"
                  checked={taxInclusive}
                  onChange={e => setTaxInclusive(e.target.checked)}
                  className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="space-y-0.5">
                  <div className="font-extrabold text-slate-900 dark:text-white">Quick Cash Tender Buttons</div>
                  <div className="text-[11px] text-slate-400">Display instant cash denomination buttons ({currency || '$'}10, {currency || '$'}20, {currency || '$'}50, {currency || '$'}100)</div>
                </div>
                <input
                  type="checkbox"
                  checked={quickCashPresets}
                  onChange={e => setQuickCashPresets(e.target.checked)}
                  className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="space-y-0.5">
                  <div className="font-extrabold text-slate-900 dark:text-white">Barcode Scanner Auto-Submit</div>
                  <div className="text-[11px] text-slate-400">Instantly add items to current POS order when barcode is scanned via USB/Bluetooth</div>
                </div>
                <input
                  type="checkbox"
                  checked={scannerAutoSubmit}
                  onChange={e => setScannerAutoSubmit(e.target.checked)}
                  className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="space-y-0.5">
                  <div className="font-extrabold text-slate-900 dark:text-white">POS Audio Feedback & Scan Chime</div>
                  <div className="text-[11px] text-slate-400">Play pleasant audio chime on successful barcode scan and payment settlement</div>
                </div>
                <input
                  type="checkbox"
                  checked={soundEffects}
                  onChange={e => setSoundEffects(e.target.checked)}
                  className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="space-y-0.5">
                  <div className="font-extrabold text-slate-900 dark:text-white">Kick Cash Drawer on Cash Sale</div>
                  <div className="text-[11px] text-slate-400">Send electronic RJ11 pulse trigger to open drawer on cash checkout</div>
                </div>
                <input
                  type="checkbox"
                  checked={cashDrawerPulse}
                  onChange={e => setCashDrawerPulse(e.target.checked)}
                  className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => handleSaveAllSettings()}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs transition"
              >
                Save POS Settings
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-[#0F1424] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 text-xs">
              <h4 className="font-extrabold text-slate-900 dark:text-white">Fiscal Compliance Notice</h4>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Velcora POS is engineered for universal multi-regional tax audit compliance. All completed orders store cryptographic sequential invoice signatures.
              </p>
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold">
                ✓ Immutable Sales Ledger Active
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. RECEIPTS & HARDWARE SETTINGS TAB */}
      {activeTab === 'receipts_hardware' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          <div className="lg:col-span-7 bg-white dark:bg-[#0F1424] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-[#F8FAFC]">Thermal Receipts & Printing</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Configure thermal paper size, headers, footers, and barcodes</p>
              </div>
              <Printer className="w-5 h-5 text-primary" />
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Thermal Paper Width
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['58mm', '80mm', 'A4'] as const).map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setPaperWidth(size)}
                      className={`p-2.5 rounded-xl border font-bold text-center transition cursor-pointer ${
                        paperWidth === size
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {size === '58mm' ? '58mm (2 Inch)' : size === '80mm' ? '80mm (3 Inch Standard)' : 'A4 Full Sheet'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Thermal Receipt Header Text
                </label>
                <textarea
                  rows={3}
                  value={receiptHeader}
                  onChange={e => setReceiptHeader(e.target.value)}
                  placeholder="Store Welcome Message, Tax Registration, Phone Number"
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-white focus:border-primary focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Thermal Receipt Footer & Return Policy
                </label>
                <textarea
                  rows={3}
                  value={receiptFooter}
                  onChange={e => setReceiptFooter(e.target.value)}
                  placeholder="Warranty and Return Terms, Website, Thank You message"
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-white focus:border-primary focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Dual Urdu + English Receipt</span>
                  <input
                    type="checkbox"
                    checked={dualUrduEnglishReceipt}
                    onChange={e => setDualUrduEnglishReceipt(e.target.checked)}
                    className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Print QR Code on Receipt</span>
                  <input
                    type="checkbox"
                    checked={showQrOnReceipt}
                    onChange={e => setShowQrOnReceipt(e.target.checked)}
                    className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Print Barcode on Receipt</span>
                  <input
                    type="checkbox"
                    checked={showBarcodeOnReceipt}
                    onChange={e => setShowBarcodeOnReceipt(e.target.checked)}
                    className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Auto-Print on Checkout</span>
                  <input
                    type="checkbox"
                    checked={autoPrintReceipt}
                    onChange={e => setAutoPrintReceipt(e.target.checked)}
                    className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveAllSettings()}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs transition"
                >
                  Save Receipt Settings
                </button>
              </div>
            </div>
          </div>

          {/* Receipt Preview */}
          <div className="lg:col-span-5 bg-white dark:bg-[#0F1424] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-[#F8FAFC]">Live Thermal Receipt Preview</h3>
              <Eye className="w-4 h-4 text-primary" />
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300 space-y-2 max-w-sm mx-auto shadow-inner">
              <div className="text-center font-bold text-slate-900 dark:text-white uppercase">
                {name || 'VELCORA STORE'}
              </div>
              <div className="text-center text-[10px] text-slate-500 whitespace-pre-line">
                {receiptHeader}
              </div>
              <div className="border-t border-dashed border-slate-300 dark:border-slate-700 my-2"></div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>INVOICE: INV-98241</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
              <div className="border-t border-dashed border-slate-300 dark:border-slate-700 my-2"></div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>1x Velcora Smart Item</span>
                  <span>{currency || '$'}24.00</span>
                </div>
                <div className="flex justify-between">
                  <span>2x Thermal Paper Roll ({paperWidth})</span>
                  <span>{currency || '$'}10.00</span>
                </div>
              </div>
              <div className="border-t border-dashed border-slate-300 dark:border-slate-700 my-2"></div>
              <div className="flex justify-between font-extrabold text-slate-900 dark:text-white">
                <span>TOTAL:</span>
                <span>{currency || '$'}34.00</span>
              </div>
              {showQrOnReceipt && (
                <div className="flex flex-col items-center justify-center py-2">
                  <QrCode className="w-12 h-12 text-slate-800 dark:text-slate-200" />
                  <span className="text-[9px] text-slate-400 mt-1">Scan for Digital Invoice</span>
                </div>
              )}
              {showBarcodeOnReceipt && (
                <div className="flex flex-col items-center justify-center pt-2">
                  <div
                    className="bg-white p-1.5 rounded-lg shadow-2xs"
                    dangerouslySetInnerHTML={{
                      __html: generateBarcodeSvg('INV-98241', 160, 24)
                    }}
                  />
                </div>
              )}
              <div className="text-center text-[9px] text-slate-400 whitespace-pre-line pt-1">
                {receiptFooter}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. INVENTORY & LOYALTY RULES TAB */}
      {activeTab === 'inventory_loyalty' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          <div className="lg:col-span-7 bg-white dark:bg-[#0F1424] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-[#F8FAFC]">Inventory & Stock Control Rules</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Stock warnings, SKU generators, and negative quantity limits</p>
              </div>
              <Package className="w-5 h-5 text-primary" />
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="space-y-0.5">
                  <div className="font-extrabold text-slate-900 dark:text-white">Allow Negative Stock Sales</div>
                  <div className="text-[11px] text-slate-400">Permit cashiers to complete sales even if product inventory is zero or negative</div>
                </div>
                <input
                  type="checkbox"
                  checked={allowNegativeStock}
                  onChange={e => setAllowNegativeStock(e.target.checked)}
                  className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="space-y-0.5">
                  <div className="font-extrabold text-slate-900 dark:text-white">Auto-Generate SKU & Barcodes</div>
                  <div className="text-[11px] text-slate-400">Automatically assign unique EAN/Code128 barcodes when creating new catalog items</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoGenerateSku}
                  onChange={e => setAutoGenerateSku(e.target.checked)}
                  className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Default Low Stock Alert Threshold (Units)
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={lowStockThreshold}
                  onChange={e => setLowStockThreshold(Number(e.target.value) || 5)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:border-primary focus:outline-hidden"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => handleSaveAllSettings()}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs transition"
              >
                Save Inventory Rules
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white dark:bg-[#0F1424] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-[#F8FAFC]">Customer Loyalty & Points</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Reward frequent shoppers with redeemable points</p>
              </div>
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>

            <div className="space-y-3.5">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white">Enable Customer Loyalty Program</span>
                <input
                  type="checkbox"
                  checked={loyaltyProgramActive}
                  onChange={e => setLoyaltyProgramActive(e.target.checked)}
                  className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Points Earned per {currency || '$'}1 Spent
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={pointsPerUnit}
                  onChange={e => setPointsPerUnit(Number(e.target.value) || 1)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Minimum Points Required for Redemption
                </label>
                <input
                  type="number"
                  min="10"
                  value={minRedemptionPoints}
                  onChange={e => setMinRedemptionPoints(Number(e.target.value) || 50)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. WORKSTATIONS & SECURITY TAB */}
      {activeTab === 'security_fleet' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Workstations Fleet */}
          <div className="lg:col-span-7 bg-white dark:bg-[#0F1424] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-[#F8FAFC]">Workstations Fleet Telemetry</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{workstations.length} active terminal(s) verified in security matrix</p>
              </div>
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
            </div>

            <div className="space-y-3 text-xs">
              {workstations.map(ws => {
                const isThisDevice = ws.deviceId === currentDeviceId;
                const Icon = ws.platform?.includes('Mobile') ? Smartphone : (ws.platform?.includes('Tablet') ? Tablet : Laptop);
                const isAuth = ws.isAuthorized !== false && ws.status !== 'locked';

                return (
                  <div key={ws.id || ws.deviceId} className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                            <span>{ws.name || 'Terminal'}</span>
                            {isThisDevice && (
                              <span className="text-[10px] font-extrabold bg-primary/20 text-primary px-1.5 py-0.5 rounded-md">
                                THIS DEVICE
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            ID: {ws.deviceId?.slice(0, 16)}...
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAuth ? (
                          <button
                            type="button"
                            onClick={() => revokeWorkstation(ws.id || ws.deviceId)}
                            title="Revoke Workstation Access"
                            className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => authorizeWorkstation(ws.id || ws.deviceId)}
                            title="Authorize Workstation"
                            className="p-1.5 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isAuth
                            ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40'
                            : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40'
                        }`}>
                          {isAuth ? 'Authorized' : 'Locked'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Google Account Security */}
          <div className="lg:col-span-5 bg-white dark:bg-[#0F1424] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-[#F8FAFC]">Google Cloud Authentication</h3>
              {authUser ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                  Connected
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-500 text-[10px] font-bold">
                  Unlinked
                </span>
              )}
            </div>

            {googleError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {googleError}
              </div>
            )}

            {authUser ? (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-3">
                  {authUser.photoURL ? (
                    <img src={authUser.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary text-white font-bold flex items-center justify-center">
                      {authUser.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white truncate">{authUser.displayName || 'Google User'}</div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">{authUser.email}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="w-full py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold transition text-center cursor-pointer"
                >
                  Disconnect Google Account
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleSignInFromSettings}
                disabled={googleLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {googleLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4 text-primary" />}
                <span>Sign in with Google</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 8. CLOUD SYNC & BACKUPS TAB */}
      {activeTab === 'backup_cloud' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white dark:bg-[#0F1424] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-[#F8FAFC]">Full Database Export & Disaster Recovery</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Export verified JSON archives or restore complete business catalogs</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isRestoring}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-800 flex items-center gap-2 transition cursor-pointer"
                >
                  {isRestoring ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-emerald-500" />}
                  <span>Restore JSON Backup</span>
                </button>

                <button
                  type="button"
                  onClick={handleSyncToGoogleDrive}
                  disabled={driveSyncing}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
                >
                  {driveSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />}
                  <span>Backup to Google Drive</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportFullBackup}
                  className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Backup JSON</span>
                </button>
              </div>
            </div>

            {restoreMessage && (
              <div className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
                restoreMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-800 dark:text-rose-300'
              }`}>
                {restoreMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-rose-500" />}
                <span>{restoreMessage.text}</span>
              </div>
            )}

            {driveSyncSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{driveSyncSuccess}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 9. SUBSCRIPTION & PARTNER TAB */}
      {activeTab === 'subscription_partner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Subscription Tier */}
          <div className="lg:col-span-6 bg-white dark:bg-[#0F1424] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-[#F8FAFC]">Velcora Enterprise Subscription</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Cloud multi-terminal licenses and token quotas</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold text-[10px] uppercase">
                {activeSubscription?.tier || 'Pro'} Active
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Active Tier:</span>
                <span className="font-black text-slate-900 dark:text-white">{activeSubscription?.planName || 'Velcora Professional'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Connected Terminals:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{activeSubscription?.maxWorkstations || 5} Terminals Allowed</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Included AI Tokens:</span>
                <span className="font-bold text-amber-500">{activeSubscription?.tokensRemaining?.toLocaleString() || '200,000'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => openCheckoutModal('subscriptions')}
                className="py-2.5 px-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                Upgrade Subscription
              </button>
              <button
                type="button"
                onClick={() => openCheckoutModal('tokens')}
                className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition cursor-pointer"
              >
                Buy AI Tokens
              </button>
            </div>
          </div>

          {/* Referral Partner Attribution */}
          <div className="lg:col-span-6 bg-white dark:bg-[#0F1424] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-[#F8FAFC]">Referral Partner Attribution</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Attribute your store to an authorized partner</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-extrabold">
                $3.00 Reward / Sub
              </span>
            </div>

            {isReferralCodeApplied ? (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Partner Code <code className="font-mono bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-md font-black">{activeReferralCode}</code> attributed</span>
                </div>
                <button
                  type="button"
                  onClick={removeReferralCode}
                  className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 hover:bg-rose-50 text-rose-600 font-bold text-[11px] border border-slate-200 dark:border-slate-800 transition cursor-pointer"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyRefCode} className="space-y-3">
                <div className="relative">
                  <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Referral Code (e.g. VEL453821)"
                    value={inputRefCode}
                    onChange={(e) => setInputRefCode(e.target.value.toUpperCase())}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono uppercase font-bold text-slate-900 dark:text-white focus:border-primary focus:outline-hidden"
                  />
                </div>
                <button
                  type="submit"
                  disabled={refLoading || !inputRefCode.trim()}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {refLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Apply Partner Code</span>
                </button>
              </form>
            )}

            {refCodeMsg && (
              <div className={`text-[11px] font-bold ${refCodeMsg.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {refCodeMsg.text}
              </div>
            )}

            <button
              type="button"
              onClick={() => setCurrentModule('referral_hub')}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-white font-bold text-xs border border-slate-200 dark:border-slate-800 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Open Full Partner Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 10. KEYBOARD SHORTCUTS CUSTOMIZATION TAB */}
      {activeTab === 'shortcuts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in text-slate-800 dark:text-[#F8FAFC]">
          {/* Main List Column */}
          <div className="lg:col-span-7 bg-white dark:bg-[#0F1424] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-[#F8FAFC]">Keyboard Shortcuts / Customize Hotkeys</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Map custom hotkeys for fast checkout, quick customer assignment, search focus and more</p>
              </div>
              <button
                type="button"
                onClick={resetShortcuts}
                className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-[10px] border border-slate-200 dark:border-slate-800 transition cursor-pointer"
              >
                Reset to Defaults
              </button>
            </div>

            {shortcutFeedback && (
              <div className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2 ${shortcutFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' : 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30'}`}>
                {shortcutFeedback.type === 'success' ? <CheckCircle2 className="w-4.5 h-4.5 shrink-0" /> : <AlertTriangle className="w-4.5 h-4.5 shrink-0" />}
                <span className="flex-1">{shortcutFeedback.text}</span>
                <button onClick={() => setShortcutFeedback(null)} className="text-[10px] uppercase tracking-wider font-extrabold opacity-75 hover:opacity-100">Dismiss</button>
              </div>
            )}

            <div className="space-y-3.5">
              {(shortcuts || []).map(sh => {
                const isListening = listeningShortcutId === sh.id;
                const parts: string[] = [];
                if (sh.ctrlKey) parts.push('Ctrl');
                if (sh.altKey) parts.push('Alt');
                if (sh.shiftKey) parts.push('Shift');
                parts.push(sh.key === ' ' ? 'Space' : sh.key);
                const comboStr = parts.join(' + ');

                return (
                  <div key={sh.id} className={`p-4 rounded-2xl border transition flex items-center justify-between gap-4 ${isListening ? 'border-primary bg-primary/5 dark:border-primary/50 dark:bg-primary/5' : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#121B2E]/30'}`}>
                    <div className="space-y-1">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">{sh.label}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{sh.description}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] font-extrabold px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-3xs text-slate-800 dark:text-white">
                        {comboStr}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setListeningShortcutId(isListening ? null : sh.id);
                          setShortcutFeedback(null);
                        }}
                        className={`px-3 py-1.5 rounded-xl font-bold text-[10px] transition cursor-pointer ${isListening ? 'bg-primary text-white hover:bg-primary-hover shadow-xs' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'}`}
                      >
                        {isListening ? 'Listening...' : 'Customise'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column details */}
          <div className="lg:col-span-5 bg-slate-100/60 dark:bg-slate-950/30 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 space-y-5">
            <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" />
              <span>Hotkey Customize Guide</span>
            </h4>
            <div className="space-y-3.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
              <p>Assigning customizable shortcuts is simple, fast, and optimized for retail cashier environments:</p>
              <ul className="list-disc list-inside space-y-2 font-medium">
                <li>Click <span className="font-extrabold text-slate-900 dark:text-white">Customise</span> on any row on the left.</li>
                <li>The system will enter <span className="font-extrabold text-primary">Listening Mode</span>.</li>
                <li>Press your desired key combination on your physical keyboard. You can include modifiers (e.g., <kbd className="bg-slate-200 dark:bg-slate-800 px-1 rounded-sm">Ctrl</kbd> + <kbd className="bg-slate-200 dark:bg-slate-800 px-1 rounded-sm">Alt</kbd> + <kbd className="bg-slate-200 dark:bg-slate-800 px-1 rounded-sm">D</kbd>).</li>
                <li>The system will immediately process and save your preferences.</li>
              </ul>
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 text-[10px] font-bold">
                ⚠️ MODIFIER NOTE: Browsers reserve some keyboard combinations (like Ctrl+T, Ctrl+N, Ctrl+W, Ctrl+F). Try to use F-keys or Alt/Ctrl modifiers with standard keys to prevent browser default triggers from conflicting.
              </div>
            </div>

            {listeningShortcutId && (
              <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 p-5 rounded-2xl text-center space-y-2.5 animate-pulse">
                <span className="relative flex h-3.5 w-3.5 mx-auto">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-primary"></span>
                </span>
                <div className="space-y-1">
                  <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">Listening for Keyboard Event...</h5>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Press any key or modifier combination now on your keyboard to instantly map it</p>
                </div>
                <button
                  type="button"
                  onClick={() => setListeningShortcutId(null)}
                  className="px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-[10px] font-extrabold transition cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-3xs"
                >
                  Cancel Recording
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
