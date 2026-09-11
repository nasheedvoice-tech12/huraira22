import React, { useState } from 'react';
import { useVelcora } from '../context/VelcoraContext';
import {
  Sparkles, Check, ArrowRight, ArrowLeft, Store, ShieldCheck,
  Percent, Globe, Layers, Wand2, X, RefreshCw, Smartphone,
  ShoppingBag, Utensils, Pill, Wrench, Package, Scissors, Box
} from 'lucide-react';
import { IndustryType, SystemModuleKey, CurrencyCode, LocaleCode, CatalogSchema } from '../types';
import { VELCORA_COLOR_PALETTES } from '../constants/themeColors';
import { getApiUrl } from '../lib/apiConfig';

interface OnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInitialSetup?: boolean;
}

const INDUSTRY_PRESETS: {
  id: IndustryType;
  title: string;
  icon: any;
  tagline: string;
  defaultModules: SystemModuleKey[];
  defaultTax: number;
}[] = [
  {
    id: 'clothing',
    title: 'Fashion & Apparel',
    icon: ShoppingBag,
    tagline: 'Size & color matrix, seasonal collections, loyalty points, online store',
    defaultModules: ['pos', 'products', 'variants', 'inventory', 'customers', 'loyalty', 'online_store', 'business_brain'],
    defaultTax: 8.0,
  },
  {
    id: 'restaurant',
    title: 'Restaurant & Cafe',
    icon: Utensils,
    tagline: 'Table orders, recipe batch costs, quick modifier billing, kitchen delivery notes',
    defaultModules: ['pos', 'products', 'inventory', 'delivery_notes', 'expenses', 'financial_reports', 'business_brain'],
    defaultTax: 10.0,
  },
  {
    id: 'pharmacy',
    title: 'Pharmacy & Healthcare',
    icon: Pill,
    tagline: 'Batch & expiry tracking, doctor prescriptions, dosage notes, low stock alerts',
    defaultModules: ['pos', 'products', 'batch_tracking', 'inventory', 'suppliers', 'purchases', 'customers', 'financial_reports'],
    defaultTax: 0.0,
  },
  {
    id: 'repair',
    title: 'Electronics & Repair',
    icon: Wrench,
    tagline: 'IMEI/serial tracking, repair estimates, technician assignments, warranty tickets',
    defaultModules: ['pos', 'products', 'serial_tracking', 'estimates', 'sales_orders', 'inventory', 'customers'],
    defaultTax: 7.5,
  },
  {
    id: 'wholesale',
    title: 'Wholesale & Distribution',
    icon: Package,
    tagline: 'B2B tier pricing, bulk purchasing, credit notes, sales order dispatching',
    defaultModules: ['pos', 'products', 'sales_orders', 'estimates', 'creditNotes' as any, 'suppliers', 'purchases', 'budgets', 'financial_reports'],
    defaultTax: 5.0,
  },
  {
    id: 'grocery',
    title: 'Supermarket & Grocery',
    icon: Store,
    tagline: 'High-speed barcode checkout, perishable expiry audits, customer loyalty',
    defaultModules: ['pos', 'products', 'barcodes', 'batch_tracking', 'inventory', 'customers', 'loyalty', 'financial_reports'],
    defaultTax: 4.0,
  },
  {
    id: 'salon',
    title: 'Salon & Spa Services',
    icon: Scissors,
    tagline: 'Stylist commissions, client appointment history, service packages',
    defaultModules: ['pos', 'products', 'commissions', 'customers', 'loyalty', 'expenses'],
    defaultTax: 8.5,
  },
  {
    id: 'custom',
    title: 'Custom Enterprise',
    icon: Box,
    tagline: 'Bespoke workflow with fully configurable modules and custom fields',
    defaultModules: ['pos', 'products', 'inventory', 'customers', 'financial_reports', 'business_brain'],
    defaultTax: 8.0,
  },
];

const MODULE_DEFINITIONS: {
  key: SystemModuleKey;
  label: string;
  category: 'Core Register' | 'Catalog & Stock' | 'CRM & Loyalty' | 'Sales & Fulfillment' | 'Intelligence & Marketing';
  description: string;
}[] = [
  { key: 'pos', label: 'POS Billing Register', category: 'Core Register', description: 'Fast cashier scanning, multi-tender payments, held carts, discounts & tax calculation.' },
  { key: 'products', label: 'Product Catalog', category: 'Catalog & Stock', description: 'Universal item management, categorizations, pricing, cost tracking & images.' },
  { key: 'variants', label: 'Matrix Variants (Size/Color)', category: 'Catalog & Stock', description: 'Multi-attribute variant management with individual SKU barcodes.' },
  { key: 'inventory', label: 'Stocktake & Stock Audits', category: 'Catalog & Stock', description: 'Real-time quantity on hand, reorder alerts, warehouse stock adjustments.' },
  { key: 'batch_tracking', label: 'Batch & Expiry Date Tracking', category: 'Catalog & Stock', description: 'FEFO/FIFO inventory tracking with expiration date alerts.' },
  { key: 'serial_tracking', label: 'Serial & IMEI Device Tracking', category: 'Catalog & Stock', description: 'Track unique device identifiers for warranties and technician logs.' },
  { key: 'barcodes', label: 'Barcode Label Printing & Generator', category: 'Catalog & Stock', description: 'Generate standard Code128, EAN-13, and QR codes for thermal sticker printers.' },
  { key: 'customers', label: 'Customer CRM & Profiles', category: 'CRM & Loyalty', description: 'Customer purchase history, credit balances, contact books & segmentation.' },
  { key: 'loyalty', label: 'Loyalty Points & VIP Tiers', category: 'CRM & Loyalty', description: 'Earn-and-burn point engine with tiered multipliers (Silver, Gold, Platinum).' },
  { key: 'sales_orders', label: 'Sales Orders & Invoicing', category: 'Sales & Fulfillment', description: 'Advance sales bookings, scheduled fulfillments, and formal invoices.' },
  { key: 'estimates', label: 'Quotations & Estimates', category: 'Sales & Fulfillment', description: 'Create draft proposals and 1-click convert them into active POS orders.' },
  { key: 'suppliers', label: 'Suppliers & Vendors CRM', category: 'Sales & Fulfillment', description: 'Vendor directory, contact ledgers, payables, and payment terms.' },
  { key: 'purchases', label: 'Purchase Orders & Stock Receiving', category: 'Sales & Fulfillment', description: 'Automated PO drafting, goods received notes, and landed cost recalculation.' },
  { key: 'financial_reports', label: 'Financial Reports & P&L', category: 'Sales & Fulfillment', description: 'Net profit margins, tax summaries, revenue trends, and CSV/PDF export.' },
  { key: 'business_brain', label: 'Velcora Business Brain AI', category: 'Intelligence & Marketing', description: 'Deterministic health diagnostics, root-cause leak detection, and executive plans.' },
  { key: 'online_store', label: 'Online Store Beta E-Commerce', category: 'Intelligence & Marketing', description: 'Instant consumer-facing digital catalog with live stock sync and web orders.' },
];

const COUNTRY_CURRENCY_PRESETS = [
  { country: 'United States', currency: 'USD' as CurrencyCode, symbol: '$', label: 'United States — USD ($)' },
  { country: 'Pakistan', currency: 'PKR' as CurrencyCode, symbol: '₨', label: 'Pakistan — PKR (₨)' },
  { country: 'United Kingdom', currency: 'GBP' as CurrencyCode, symbol: '£', label: 'United Kingdom — GBP (£)' },
  { country: 'United Arab Emirates', currency: 'AED' as CurrencyCode, symbol: 'AED', label: 'United Arab Emirates — AED (AED)' },
  { country: 'Saudi Arabia', currency: 'SAR' as CurrencyCode, symbol: 'SAR', label: 'Saudi Arabia — SAR (SR)' },
  { country: 'Europe', currency: 'EUR' as CurrencyCode, symbol: '€', label: 'Europe — EUR (€)' },
  { country: 'Canada', currency: 'CAD' as CurrencyCode, symbol: 'CA$', label: 'Canada — CAD (C$)' },
  { country: 'Australia', currency: 'AUD' as CurrencyCode, symbol: 'AU$', label: 'Australia — AUD (AU$)' },
  { country: 'India', currency: 'INR' as CurrencyCode, symbol: '₹', label: 'India — INR (₹)' },
  { country: 'Japan', currency: 'JPY' as CurrencyCode, symbol: '¥', label: 'Japan — JPY (¥)' },
  { country: 'China', currency: 'CNY' as CurrencyCode, symbol: '¥', label: 'China — CNY (¥)' },
];

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = ({ isOpen, onClose, isInitialSetup = false }) => {
  const { completeOnboarding } = useVelcora();

  const [step, setStep] = useState<number>(1);
  const [businessName, setBusinessName] = useState<string>('Solstice Atelier');
  const [industry, setIndustry] = useState<IndustryType>('clothing');
  const [businessModel, setBusinessModel] = useState<'product' | 'service' | 'hybrid'>('product');
  const [country, setCountry] = useState<string>('United States');
  const [primaryColor, setPrimaryColor] = useState<string>('#5B5CE2');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [language, setLanguage] = useState<LocaleCode>('en');
  const [taxRate, setTaxRate] = useState<number>(8.0);
  const [taxInclusive, setTaxInclusive] = useState<boolean>(false);
  const [enabledModules, setEnabledModules] = useState<SystemModuleKey[]>([
    'pos', 'products', 'variants', 'inventory', 'customers', 'loyalty', 'online_store', 'business_brain', 'financial_reports'
  ]);

  // AI Prompt Builder
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isAnalyzingAi, setIsAnalyzingAi] = useState<boolean>(false);
  const [aiRationale, setAiRationale] = useState<string | null>(null);
  const [aiCatalogSchema, setAiCatalogSchema] = useState<CatalogSchema | null>(null);

  if (!isOpen) return null;

  const getModelForIndustry = (ind: IndustryType): 'product' | 'service' | 'hybrid' => {
    if (['salon', 'barber', 'repair', 'workshop', 'service', 'professional'].includes(ind)) {
      return 'service';
    }
    if (['restaurant', 'cafe'].includes(ind)) {
      return 'hybrid';
    }
    return 'product';
  };

  const handleSelectIndustry = (preset: typeof INDUSTRY_PRESETS[0]) => {
    setIndustry(preset.id);
    setTaxRate(preset.defaultTax);
    setEnabledModules(preset.defaultModules);
    setBusinessModel(getModelForIndustry(preset.id));
  };

  const handleToggleModule = (key: SystemModuleKey) => {
    if (key === 'pos' || key === 'products') return; // mandatory
    setEnabledModules(prev =>
      prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]
    );
  };

  const handleAiConfigure = async () => {
    if (!aiPrompt.trim()) return;
    setIsAnalyzingAi(true);
    try {
      const res = await fetch(getApiUrl('/api/ai/recommend-pos'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessDescription: aiPrompt }),
      });
      const data = await res.json();
      if (data.presetId) {
        setIndustry(data.presetId);
      }
      if (data.businessName && !businessName) {
        setBusinessName(data.businessName);
      }
      if (data.recommendedModules && Array.isArray(data.recommendedModules)) {
        setEnabledModules(data.recommendedModules);
      }
      if (data.rationale || data.analysis) {
        setAiRationale(data.rationale || data.analysis);
      }

      // Generate the AI-adaptive, business-specific catalog schema using the
      // platform's unified engine (DeepSeek V4 Pro primary -> Gemini fallback).
      try {
        const cRes = await fetch(getApiUrl('/api/ai/catalog-schema'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessRequirements: aiPrompt,
            industry: data.presetId || industry,
            businessName: data.businessName || businessName,
            country,
            currency,
          }),
        });
        const cData = await cRes.json();
        if (cData.success && cData.schema) {
          setAiCatalogSchema(cData.schema as CatalogSchema);
        }
      } catch (cErr) {
        console.warn('Business catalog generation failed (non-fatal):', cErr);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  const getCategoryForIndustry = (ind: IndustryType): 'retail' | 'beauty' | 'healthcare' | 'food' | 'automotive' | 'education' | 'professional' | 'other' => {
    if (['salon', 'barber'].includes(ind)) return 'beauty';
    if (['pharmacy'].includes(ind)) return 'healthcare';
    if (['restaurant', 'cafe'].includes(ind)) return 'food';
    if (['repair', 'workshop', 'auto_parts'].includes(ind)) return 'automotive';
    if (['professional'].includes(ind)) return 'professional';
    return 'retail';
  };

  const handleFinish = () => {
    completeOnboarding({
      businessName: businessName.trim() || 'My Business',
      industry,
      businessModel,
      industryCategory: getCategoryForIndustry(industry),
      primaryColor,
      country,
      currency,
      language,
      enabledModules,
      taxRate,
      taxInclusive,
      catalogSchema: aiCatalogSchema || undefined,
    });
    onClose();
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 dark:bg-black/90 backdrop-blur-md overflow-y-auto ${isInitialSetup ? 'bg-[#070A14]' : ''}`}>
      <div className="bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] rounded-3xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-slate-800 dark:text-[#F8FAFC]">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1F2E4D] flex items-center justify-between bg-slate-50 dark:bg-[#0B1220]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-primary flex items-center justify-center text-white shadow-2xs">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-900 dark:text-[#F8FAFC]">
                {isInitialSetup ? 'VELCORA — Universal Business Setup & POS Customizer' : 'Velcora Business Setup & POS Customizer'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">Step {step} of 4 — {
                step === 1 ? 'Business Identity & Localization' :
                step === 2 ? 'Industry Blueprint & AI Setup' :
                step === 3 ? 'Modular Workspace Configuration' :
                'Review & Initialize Store'
              }</p>
            </div>
          </div>
          {!isInitialSetup && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-[#152644] transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-[#0B1220] h-1.5 flex">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className={`flex-1 h-full transition-all duration-300 ${
                s <= step ? 'bg-primary' : 'bg-transparent'
              }`}
            />
          ))}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: IDENTITY & LOCALIZATION */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-[#F8FAFC] mb-1">Let's name and localize your business</h3>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">These settings configure your register headers, default currency symbols, and multi-lingual UI.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#94A3B8]">Business / Store Name *</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    placeholder="e.g. Solstice Boutique, Urban Cafe, Apex Tech Repairs"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-sm text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#94A3B8]/50 focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#94A3B8]">Country & Default Currency *</label>
                  <select
                    value={COUNTRY_CURRENCY_PRESETS.findIndex(p => p.country === country && p.currency === currency)}
                    onChange={e => {
                      const idx = parseInt(e.target.value);
                      if (!isNaN(idx) && COUNTRY_CURRENCY_PRESETS[idx]) {
                        setCountry(COUNTRY_CURRENCY_PRESETS[idx].country);
                        setCurrency(COUNTRY_CURRENCY_PRESETS[idx].currency);
                      }
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-sm text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                  >
                    {COUNTRY_CURRENCY_PRESETS.map((p, idx) => (
                      <option key={idx} value={idx}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#94A3B8]">Default Receipt Language</label>
                  <p className="text-[10px] text-slate-500">
                    The language used to print and format customer thermal receipts & commercial invoices. (The application UI remains in English).
                  </p>
                  <select
                    value={language}
                    onChange={e => setLanguage(e.target.value as LocaleCode)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-sm text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                  >
                    <option value="en">English (US / UK)</option>
                    <option value="ur">اردو (Urdu - RTL)</option>
                    <option value="zh">中文 (Chinese Simplified)</option>
                    <option value="pt">Português (Portuguese)</option>
                    <option value="ar">العربية (Arabic - RTL)</option>
                    <option value="es">Español (Spanish)</option>
                    <option value="fr">Français (French)</option>
                    <option value="de">Deutsch (German)</option>
                  </select>
                </div>
              </div>

              {/* Business Model Selection */}
              <div className="space-y-2.5 pt-2">
                <label className="text-xs font-bold text-slate-700 dark:text-[#94A3B8]">Business Operational Model *</label>
                <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-medium leading-relaxed">
                  How does your business generate revenue? We use this to adapt product catalogs, service forms, and billing terms.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setBusinessModel('product')}
                    className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
                      businessModel === 'product'
                        ? 'border-primary bg-primary-light text-slate-900 dark:text-white shadow-2xs'
                        : 'border-slate-200 dark:border-[#1F2E4D] bg-white dark:bg-[#111C30] hover:bg-slate-50 dark:hover:bg-[#152644]/50 text-slate-700 dark:text-[#94A3B8]'
                    }`}
                  >
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-[#F8FAFC]">Physical Products Only</h4>
                      <p className="text-[10px] text-slate-500 dark:text-[#94A3B8] mt-1 leading-relaxed font-medium">For retail, clothing, groceries, and electronics stores selling physical items with inventory, barcodes, SKUs, and size/color matrices.</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBusinessModel('service')}
                    className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
                      businessModel === 'service'
                        ? 'border-primary bg-primary-light text-slate-900 dark:text-white shadow-2xs'
                        : 'border-slate-200 dark:border-[#1F2E4D] bg-white dark:bg-[#111C30] hover:bg-slate-50 dark:hover:bg-[#152644]/50 text-slate-700 dark:text-[#94A3B8]'
                    }`}
                  >
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-[#F8FAFC]">Services & Bookings Only</h4>
                      <p className="text-[10px] text-slate-500 dark:text-[#94A3B8] mt-1 leading-relaxed font-medium">For salons, clinics, consulting, repairs, and spa treatments. Focuses on service durations, specialists, appointments, and commissions.</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBusinessModel('hybrid')}
                    className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
                      businessModel === 'hybrid'
                        ? 'border-primary bg-primary-light text-slate-900 dark:text-white shadow-2xs'
                        : 'border-slate-200 dark:border-[#1F2E4D] bg-white dark:bg-[#111C30] hover:bg-slate-50 dark:hover:bg-[#152644]/50 text-slate-700 dark:text-[#94A3B8]'
                    }`}
                  >
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-[#F8FAFC]">Hybrid (Products + Services)</h4>
                      <p className="text-[10px] text-slate-500 dark:text-[#94A3B8] mt-1 leading-relaxed font-medium">For hybrid setups (e.g. hair salon retailing products, auto workshop billing parts and repairs). Supports both item forms seamlessly.</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Brand Design System & Color Palette Selection */}
              <div className="p-4.5 rounded-2xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-[#F8FAFC]">Store Design System & Accent Color</h4>
                    <p className="text-[11px] text-slate-500 dark:text-[#94A3B8]">Choose your primary brand theme color. The entire system UI and POS register adapt to your choice.</p>
                  </div>
                  <span
                    className="w-5 h-5 rounded-full border border-white/40 shadow-xs transition-all"
                    style={{ backgroundColor: primaryColor }}
                  />
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-9 gap-2 pt-1">
                  {VELCORA_COLOR_PALETTES.map(palette => {
                    const isSelected = primaryColor.toLowerCase() === palette.hex.toLowerCase();
                    return (
                      <button
                        key={palette.id}
                        type="button"
                        onClick={() => setPrimaryColor(palette.hex)}
                        className={`p-2 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                          isSelected
                            ? 'bg-white dark:bg-[#111C30] border-slate-900 dark:border-white shadow-md ring-2'
                            : 'bg-white/60 dark:bg-[#111C30]/60 border-slate-200 dark:border-[#1F2E4D] hover:border-slate-400'
                        }`}
                        style={{ boxShadow: isSelected ? `0 0 0 2px ${palette.hex}` : undefined }}
                      >
                        <span
                          className="w-6 h-6 rounded-full shadow-xs flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ backgroundColor: palette.hex }}
                        >
                          {isSelected && '✓'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate w-full text-center">
                          {palette.name.replace('Velcora ', '').replace('Electric ', '')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tax Settings */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] space-y-3">
                <div className="flex items-center gap-2 text-primary font-extrabold text-xs">
                  <Percent className="w-4 h-4" />
                  <span>Sales Tax & VAT Defaults</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-[#94A3B8] mb-1 block">Default Tax Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={taxRate}
                      onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-xs text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                    />
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-[#94A3B8]">
                      <input
                        type="checkbox"
                        checked={taxInclusive}
                        onChange={e => setTaxInclusive(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 dark:border-[#1F2E4D] bg-white dark:bg-[#111C30] text-primary focus:ring-primary"
                      />
                      <span className="font-medium">Item prices are Tax-Inclusive (VAT included)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: INDUSTRY BLUEPRINT */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-[#F8FAFC] mb-1">Select your industry blueprint</h3>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">Choose a preset or tell the AI what you do for automatic module tailoring.</p>
              </div>

              {/* AI Natural Language Bar */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] space-y-3">
                <div className="flex items-center gap-2 text-primary font-extrabold text-xs">
                  <Wand2 className="w-4 h-4" />
                  <span>Ask Velcora AI to configure your store from a sentence</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    placeholder="e.g. 'I run a mobile phone repair shop with parts, technician labor, and IMEI tracking'"
                    className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-xs text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#94A3B8]/50 focus:border-primary focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAiConfigure}
                    disabled={isAnalyzingAi || !aiPrompt.trim()}
                    className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-2xs transition active:scale-98"
                  >
                    {isAnalyzingAi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>Auto-Configure</span>
                  </button>
                </div>
                {aiRationale && (
                  <p className="text-[11px] text-primary bg-primary-light p-2.5 rounded-xl border border-primary/20 font-medium">
                    💡 <strong>AI Analysis:</strong> {aiRationale}
                  </p>
                )}
              </div>

              {/* Industry Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {INDUSTRY_PRESETS.map(preset => {
                  const Icon = preset.icon;
                  const isSelected = industry === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectIndustry(preset)}
                      className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                        isSelected
                          ? 'border-primary bg-primary-light text-slate-900 dark:text-[#F8FAFC] shadow-2xs ring-2 ring-primary/20'
                          : 'border-slate-200 dark:border-[#1F2E4D] bg-white dark:bg-[#111C30] hover:bg-slate-50 dark:hover:bg-[#152644]/50 text-slate-700 dark:text-[#94A3B8]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSelected ? 'bg-primary text-white shadow-2xs' : 'bg-slate-100 dark:bg-[#0B1220] text-primary'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-primary" />}
                        </div>
                        <h4 className="font-extrabold text-xs text-slate-900 dark:text-[#F8FAFC]">{preset.title}</h4>
                        <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-1 line-clamp-2 leading-relaxed font-medium">{preset.tagline}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: MODULAR WORKSPACE CONFIG */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-[#F8FAFC] mb-1">Assemble your modules</h3>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">Toggle only what you need. You can always add or remove modules later.</p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 rounded-full bg-primary-light text-primary border border-primary/20 text-xs font-extrabold">
                    {enabledModules.length} Modules Active
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[340px] overflow-y-auto pr-1">
                {MODULE_DEFINITIONS.map(mod => {
                  const isChecked = enabledModules.includes(mod.key);
                  const isMandatory = mod.key === 'pos' || mod.key === 'products';
                  return (
                    <div
                      key={mod.key}
                      onClick={() => !isMandatory && handleToggleModule(mod.key)}
                      className={`p-3 rounded-2xl border flex items-start gap-3 cursor-pointer transition ${
                        isChecked
                          ? 'border-primary bg-primary-light text-slate-900 dark:text-[#F8FAFC]'
                          : 'border-slate-200 dark:border-[#1F2E4D] bg-white dark:bg-[#111C30] text-slate-500 dark:text-[#94A3B8] hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isMandatory}
                        onChange={() => !isMandatory && handleToggleModule(mod.key)}
                        className="mt-1 w-4 h-4 rounded border-slate-300 dark:border-[#1F2E4D] bg-white dark:bg-[#0B1220] text-primary focus:ring-primary cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-extrabold ${isChecked ? 'text-slate-900 dark:text-[#F8FAFC]' : 'text-slate-500 dark:text-[#94A3B8]'}`}>
                            {mod.label}
                          </span>
                          <span className="text-[9px] uppercase font-bold text-primary px-1.5 py-0.5 rounded bg-primary-light border border-primary/20">
                            {mod.category}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-[#94A3B8] mt-0.5 line-clamp-2 leading-relaxed font-medium">
                          {mod.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & LAUNCH */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-[#F8FAFC] mb-1">Ready to launch your tailored POS</h3>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">Review your store parameters before initializing the workspace.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] space-y-2.5">
                  <span className="text-[10px] uppercase font-extrabold text-primary tracking-wider">Business Identity</span>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-[#F8FAFC]">{businessName}</div>
                  <div className="text-xs text-slate-600 dark:text-[#94A3B8] flex items-center gap-2">
                    <span>Industry:</span>
                    <span className="px-2 py-0.5 rounded-lg bg-primary-light text-primary font-bold capitalize">
                      {industry}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-[#94A3B8]">
                    Currency: <strong className="text-slate-900 dark:text-[#F8FAFC]">{currency}</strong> | Receipt Language: <strong className="text-slate-900 dark:text-[#F8FAFC]">{language.toUpperCase()}</strong>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-[#94A3B8]">
                    Tax Rate: <strong className="text-slate-900 dark:text-[#F8FAFC]">{taxRate}%</strong> ({taxInclusive ? 'Inclusive' : 'Exclusive'})
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] space-y-2.5">
                  <span className="text-[10px] uppercase font-extrabold text-primary tracking-wider">Active Modules ({enabledModules.length})</span>
                  <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto">
                    {enabledModules.map(m => (
                      <span key={m} className="px-2 py-1 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-[10px] font-bold text-slate-700 dark:text-[#94A3B8] capitalize">
                        {m.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-extrabold text-slate-900 dark:text-[#F8FAFC]">Full Role-Based Security Configured</div>
                  <p className="text-emerald-700 dark:text-emerald-400/80 leading-relaxed font-medium">
                    Master Admin role initialized. Cashiers and staff will only see permissions explicitly assigned to their subuser profiles.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-[#1F2E4D] flex items-center justify-between bg-slate-50 dark:bg-[#0B1220]">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#152644] hover:bg-slate-200 text-slate-700 dark:text-[#F8FAFC] text-xs font-bold flex items-center gap-1.5 transition border border-slate-200 dark:border-[#1F2E4D]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : <div />}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 && !businessName.trim()}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-2xs transition active:scale-98"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-2xs transition active:scale-98"
            >
              <Check className="w-4 h-4" />
              <span>Launch Velcora Workspace</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
