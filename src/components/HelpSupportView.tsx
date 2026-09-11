import React, { useState } from 'react';
import { useVelcora } from '../context/VelcoraContext';
import { useTranslation } from '../context/TranslationContext';
import {
  HelpCircle, Keyboard, Printer, Barcode,
  BookOpen, Sparkles, CheckCircle2,
  ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';

export const HelpSupportView: React.FC = () => {
  const { setCurrentModule } = useVelcora();
  const { t } = useTranslation();
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [hardwareStatus, setHardwareStatus] = useState<{
    printer: 'idle' | 'testing' | 'ready';
    scanner: 'idle' | 'testing' | 'ready';
    drawer: 'idle' | 'testing' | 'ready';
  }>({
    printer: 'ready',
    scanner: 'ready',
    drawer: 'ready',
  });

  const shortcuts = [
    { key: 'F1', description: 'Fast Cash Checkout (Exact Tender / Quick Pay)' },
    { key: 'F2', description: 'Card / EMV Terminal Checkout' },
    { key: 'F3', description: 'Split Payment Modal' },
    { key: 'Space', description: 'Focus Product Search Bar' },
    { key: 'Esc', description: 'Clear Active Cart / Close Modal' },
    { key: 'Enter', description: 'Add Highlighted Product / Confirm' },
    { key: 'Ctrl + P', description: 'Print Last Receipt' },
    { key: 'Ctrl + H', description: 'Hold / Park Current Cart' },
  ];

  const faqs = [
    {
      q: 'How do I start my morning POS register shift?',
      a: 'Navigate to "POS Register", select your terminal station, count your opening cash float, and begin scanning products or tapping category cards.',
    },
    {
      q: 'How do I handle customer returns and refunds?',
      a: `Open "Payments" or "${t('sales')}", locate the invoice number, click "Details", and select "Refund Transaction". The inventory stock count will automatically update.`,
    },
    {
      q: 'Can I apply promotional coupons during active billing?',
      a: 'Yes! In POS register, click "Apply Coupon / Promo", type the promo code (e.g., SPRING20), and the percentage or fixed discount applies immediately to eligible items.',
    },
    {
      q: 'How does offline mode work if internet disconnects?',
      a: 'Velcora POS caches your product catalog, prices, and tax rates locally in IndexedDB. Offline sales will queue automatically and sync to the cloud as soon as connection is restored.',
    },
  ];

  const runHardwareTest = (type: 'printer' | 'scanner' | 'drawer') => {
    setHardwareStatus(prev => ({ ...prev, [type]: 'testing' }));
    setTimeout(() => {
      setHardwareStatus(prev => ({ ...prev, [type]: 'ready' }));
    }, 1200);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="velcora-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Help, Shortcuts & Support</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
              POS Companion v2.4
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Keyboard shortcuts, POS hardware testing diagnostics, staff training guides, and Velcora AI Assistant.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentModule('ask_velcora')}
            className="velcora-btn-primary flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t('ask_ai')}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Keyboard Shortcuts & Hardware Tests */}
        <div className="lg:col-span-2 space-y-6">
          {/* Keyboard Shortcuts Cheat-sheet */}
          <div className="velcora-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h2 className="font-bold text-slate-900 dark:text-white text-base">POS Keyboard Shortcuts</h2>
              </div>
              <span className="text-xs text-slate-400">Speed up checkout 3x</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {shortcuts.map((sc, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                >
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {sc.description}
                  </span>
                  <kbd className="px-2.5 py-1 text-xs font-mono font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm text-purple-600 dark:text-purple-400 shrink-0">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Hardware Diagnostics */}
          <div className="velcora-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h2 className="font-bold text-slate-900 dark:text-white text-base">Hardware Diagnostics</h2>
              </div>
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Peripherals Online
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Thermal Printer */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-center">
                <div className="w-10 h-10 mx-auto rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center">
                  <Printer className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-xs">Thermal Receipt Printer</h3>
                <p className="text-[11px] text-slate-400">ESC/POS 80mm / USB & LAN</p>
                <button
                  onClick={() => runHardwareTest('printer')}
                  disabled={hardwareStatus.printer === 'testing'}
                  className="w-full py-1.5 text-xs font-semibold rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-200 transition-colors"
                >
                  {hardwareStatus.printer === 'testing' ? 'Printing Test...' : 'Test Feed / Print'}
                </button>
              </div>

              {/* Barcode Scanner */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-center">
                <div className="w-10 h-10 mx-auto rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center">
                  <Barcode className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-xs">Laser Barcode Scanner</h3>
                <p className="text-[11px] text-slate-400">1D / 2D QR HID Keyboard</p>
                <button
                  onClick={() => runHardwareTest('scanner')}
                  disabled={hardwareStatus.scanner === 'testing'}
                  className="w-full py-1.5 text-xs font-semibold rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-200 transition-colors"
                >
                  {hardwareStatus.scanner === 'testing' ? 'Listening...' : 'Test Beep & Read'}
                </button>
              </div>

              {/* Cash Drawer */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-center">
                <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-xs">Cash Drawer Kick Relay</h3>
                <p className="text-[11px] text-slate-400">RJ11 / RJ12 24V Solenoid</p>
                <button
                  onClick={() => runHardwareTest('drawer')}
                  disabled={hardwareStatus.drawer === 'testing'}
                  className="w-full py-1.5 text-xs font-semibold rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 transition-colors"
                >
                  {hardwareStatus.drawer === 'testing' ? 'Opening...' : 'Test Drawer Kick'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: FAQs & Quick Guides */}
        <div className="space-y-4">
          <div className="velcora-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">Staff FAQ & Knowledge</h2>
            </div>

            <div className="space-y-2">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                >
                  <button
                    onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                    className="w-full p-3 text-left font-semibold text-xs text-slate-900 dark:text-white flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    <span>{faq.q}</span>
                    {activeFaq === index ? <ChevronUp className="w-3.5 h-3.5 text-purple-600" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                  </button>
                  {activeFaq === index && (
                    <div className="px-3 pb-3 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2 bg-slate-50/50 dark:bg-slate-900/50">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="velcora-card p-5 bg-gradient-to-br from-purple-900/20 to-indigo-900/10 border-purple-200 dark:border-purple-800/60 space-y-3">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-bold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Need Advanced Setup?</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Velcora AI Assistant can generate reports, adjust stock, write marketing copy, or analyze sales trends instantly.
            </p>
            <button
              onClick={() => setCurrentModule('ask_velcora')}
              className="w-full py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Open Velcora AI Chat</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
