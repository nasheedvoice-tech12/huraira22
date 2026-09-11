import React, { useState, useEffect, useRef } from 'react';
import { useVelcora } from '../context/VelcoraContext';
import {
  Mic, MicOff, Sparkles, X, Volume2, ArrowRight,
  CheckCircle2, AlertCircle, ShoppingCart, Search,
  TrendingUp, Layers, Terminal, Zap, Bot
} from 'lucide-react';
import { soundEffects } from '../utils/audioEffects';
import { getApiUrl } from '../lib/apiConfig';

interface VelcoraVoiceHudModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface VoiceLog {
  id: string;
  transcript: string;
  response: string;
  status: 'success' | 'info' | 'error';
  timestamp: string;
}

export const VelcoraVoiceHudModal: React.FC<VelcoraVoiceHudModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    products,
    addToCart,
    setCurrentModule,
    brainMetrics,
    brainHealth,
    activeBusiness,
    cart,
    clearCart,
    holdCurrentCart,
    currency} = useVelcora();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [typedInput, setTypedInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [history, setHistory] = useState<VoiceLog[]>([
    {
      id: 'init',
      transcript: 'Voice Pilot Ready',
      response: `Velcora Neural Voice Pilot initialized. Try speaking or typing commands like "Add 2 Denim Jackets", "Go to Inventory", or "What is our revenue?".`,
      status: 'info',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        soundEffects.playVoiceActive();
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);

        // If finalized speech chunk
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
          executeVoiceCommand(lastResult[0].transcript);
        }
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch {
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.warn('Error starting speech recognition:', e);
      }
    }
  };

  // Speak response back using Web SpeechSynthesis
  const speakText = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const clean = text.replace(/[*#`_]/g, '');
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.08;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Natural Language Voice Command Execution Engine
  const executeVoiceCommand = async (rawCommand: string) => {
    const cmd = rawCommand.toLowerCase().trim();
    if (!cmd) return;

    setIsProcessing(true);
    let replyText = '';
    let status: 'success' | 'info' | 'error' = 'success';

    // 1. Navigation Commands
    if (cmd.includes('go to') || cmd.includes('open') || cmd.includes('switch to') || cmd.includes('navigate to') || cmd.includes('show')) {
      if (cmd.includes('pos') || cmd.includes('billing') || cmd.includes('register') || cmd.includes('checkout') || cmd.includes('cashier')) {
        setCurrentModule('pos');
        replyText = 'Navigated to POS Billing Register.';
      } else if (cmd.includes('brain') || cmd.includes('health') || cmd.includes('diagnostic')) {
        setCurrentModule('business_brain');
        replyText = 'Opened Velcora Business Brain.';
      } else if (cmd.includes('inventory') || cmd.includes('stock')) {
        setCurrentModule('inventory');
        replyText = 'Opened Inventory & Stock Management.';
      } else if (cmd.includes('product') || cmd.includes('catalog')) {
        setCurrentModule('products');
        replyText = 'Opened Product Catalog.';
      } else if (cmd.includes('report') || cmd.includes('analytic') || cmd.includes('finance')) {
        setCurrentModule('financial_reports');
        replyText = 'Opened Reports & Financial Analytics.';
      } else if (cmd.includes('customer') || cmd.includes('loyalty') || cmd.includes('crm')) {
        setCurrentModule('customers');
        replyText = 'Opened Customer CRM & Loyalty.';
      } else if (cmd.includes('supplier') || cmd.includes('purchase') || cmd.includes('order')) {
        setCurrentModule('purchases');
        replyText = 'Opened Purchasing & Supplier Management.';
      } else if (cmd.includes('ai') || cmd.includes('router') || cmd.includes('gateway')) {
        setCurrentModule('ai_router');
        replyText = 'Opened Universal AI Router.';
      } else if (cmd.includes('online') || cmd.includes('store') || cmd.includes('ecommerce')) {
        setCurrentModule('online_store');
        replyText = 'Opened Online E-Commerce Store Beta.';
      } else {
        replyText = `Understood navigation request. Please specify module (POS, Brain, Inventory, Reports, Customers).`;
        status = 'info';
      }
    }
    // 2. POS Cart Actions: Add Product
    else if (cmd.includes('add') || cmd.includes('put') || cmd.includes('insert')) {
      // Extract quantity if mentioned (e.g. "add 3 denim jackets", "add two coffee")
      let qty = 1;
      const numberMatch = cmd.match(/\b(\d+)\b/);
      if (numberMatch) {
        qty = parseInt(numberMatch[1], 10);
      } else if (cmd.includes('two')) qty = 2;
      else if (cmd.includes('three')) qty = 3;
      else if (cmd.includes('four')) qty = 4;
      else if (cmd.includes('five')) qty = 5;

      // Find best matching product
      const queryClean = cmd
        .replace(/add/g, '')
        .replace(/put/g, '')
        .replace(/insert/g, '')
        .replace(/to cart/g, '')
        .replace(/\b(\d+)\b/g, '')
        .replace(/item/g, '')
        .replace(/product/g, '')
        .replace(/units?/g, '')
        .trim();

      const matchedProduct = products.find(p =>
        p.name.toLowerCase().includes(queryClean) ||
        p.sku.toLowerCase().includes(queryClean) ||
        queryClean.includes(p.name.toLowerCase())
      ) || products[0];

      if (matchedProduct) {
        addToCart(matchedProduct, undefined, qty);
        soundEffects.playSuccess();
        replyText = `Added ${qty}x "${matchedProduct.name}" to POS cart (${currency}${((matchedProduct.sellingPrice ?? 0) * qty).toFixed(2)}).`;
        status = 'success';
      } else {
        replyText = `Could not locate product matching "${queryClean}". Please check product name.`;
        status = 'error';
      }
    }
    // 3. Cart Clearance & Hold
    else if (cmd.includes('clear cart') || cmd.includes('empty cart') || cmd.includes('reset cart')) {
      clearCart();
      replyText = 'Active POS cart cleared.';
    } else if (cmd.includes('hold cart') || cmd.includes('pause cart') || cmd.includes('park cart')) {
      if (cart.length > 0) {
        holdCurrentCart('Voice Parked Order');
        replyText = 'Cart successfully parked in Held Carts.';
      } else {
        replyText = 'Cart is currently empty; nothing to hold.';
        status = 'info';
      }
    }
    // 4. Financial & Stock Queries
    else if (cmd.includes('revenue') || cmd.includes('sales') || cmd.includes('income')) {
      replyText = `Current realized revenue is ${currency}${brainMetrics.totalRevenue.toLocaleString()} with ${brainMetrics.totalTransactions} transactions.`;
    } else if (cmd.includes('margin') || cmd.includes('profit')) {
      replyText = `Net operating profit margin is ${brainMetrics.profitMargin}% (${currency}${brainMetrics.netProfit.toLocaleString()} net profit).`;
    } else if (cmd.includes('health') || cmd.includes('score')) {
      replyText = brainHealth.hasData && brainHealth.overallScore !== null
        ? `Overall business health score is ${brainHealth.overallScore}/100 with ${brainHealth.problems.length} active attention items.`
        : 'Business health score is currently not available. Record POS sales or add inventory to calculate real diagnostics.';
    } else if (cmd.includes('stock') || cmd.includes('inventory') || cmd.includes('low stock')) {
      replyText = `There are currently ${brainMetrics.lowStockCount} items below safety reorder threshold in inventory.`;
    }
    // 5. Fallback: Ask Velcora AI
    else {
      try {
        const res = await fetch(getApiUrl('/api/ai/ask'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: rawCommand,
            businessContext: {
              businessName: activeBusiness.name,
              industry: activeBusiness.industry,
              healthScore: brainHealth.overallScore,
              revenue: brainMetrics.totalRevenue,
              netProfit: brainMetrics.netProfit,
              profitMargin: brainMetrics.profitMargin,
              lowStockCount: brainMetrics.lowStockCount,
              currency,
            },
          }),
        });
        const data = await res.json();
        replyText = data.reply ? (data.reply.length > 200 ? data.reply.substring(0, 200) + '...' : data.reply) : 'No response was returned by the AI engine.';
      } catch {
        replyText = `Unable to connect to the Velcora AI intelligence engine right now.`;
      }
    }

    const logEntry: VoiceLog = {
      id: `log-${Date.now()}`,
      transcript: rawCommand,
      response: replyText,
      status,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setHistory(prev => [logEntry, ...prev.slice(0, 8)]);
    speakText(replyText);
    setIsProcessing(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedInput.trim()) return;
    executeVoiceCommand(typedInput);
    setTypedInput('');
  };

  if (!isOpen) return null;

  return (
    <div id="velcora-voice-hud-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/70 backdrop-blur-md animate-in fade-in">
      <div className="bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col relative text-slate-800 dark:text-[#F8FAFC]">
        {/* Glow Header */}
        <div className="relative p-5 sm:p-6 border-b border-slate-200 dark:border-[#1F2E4D] bg-slate-50 dark:bg-[#0B1220]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-[#152644] border border-blue-200 dark:border-[#1F2E4D] flex items-center justify-center shadow-xs">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-[#06B6D4]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight">Velcora Neural Voice Pilot</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 dark:bg-[#152644] text-blue-600 dark:text-[#06B6D4] border border-blue-200 dark:border-[#1F2E4D]">
                    HUD 2.0
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">
                  Hands-free natural language POS cashiering, navigation & business analytics
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1E2E4A] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Holographic Waveform Animation */}
          <div className="mt-6 flex flex-col items-center justify-center py-4 bg-slate-100 dark:bg-[#0B1220] rounded-2xl border border-slate-200 dark:border-[#1F2E4D] relative overflow-hidden">
            <div className="flex items-center justify-center gap-1.5 h-14">
              {[12, 28, 45, 20, 52, 38, 60, 42, 26, 50, 32, 18, 40, 24, 15].map((h, i) => (
                <div
                  key={i}
                  className={`w-1.5 rounded-full transition-all duration-150 ${
                    isListening
                      ? 'bg-[#2563EB] animate-pulse shadow-2xs shadow-blue-500'
                      : 'bg-slate-300 dark:bg-[#1E2E4A]'
                  }`}
                  style={{
                    height: isListening ? `${Math.max(10, (h * Math.sin(Date.now() / 200 + i)) + 30)}px` : '8px',
                  }}
                />
              ))}
            </div>

            {/* Live Transcript / Status */}
            <div className="text-center px-4 mt-2">
              <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-[#F8FAFC] min-h-[22px]">
                {transcript || (isListening ? 'Listening for speech...' : 'Click microphone or type command below')}
              </p>
              <span className="text-[10px] text-blue-600 dark:text-[#06B6D4] font-mono mt-1 block">
                {isListening ? '● REC • Say "Add [item]", "Go to [module]", "What is my revenue?"' : 'Shortcut: Alt + V'}
              </span>
            </div>

            {/* Big Glow Mic Button */}
            <div className="mt-4">
              <button
                onClick={toggleListening}
                className={`p-4 rounded-full transition-all duration-300 transform active:scale-95 shadow-xl flex items-center justify-center ${
                  isListening
                    ? 'bg-rose-500 hover:bg-rose-600 text-white ring-8 ring-rose-500/20 animate-pulse'
                    : 'bg-[#2563EB] hover:bg-blue-700 text-white ring-8 ring-blue-500/20 shadow-2xs'
                }`}
                title={isListening ? 'Stop Listening' : 'Start Listening'}
              >
                {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Voice Command Chips */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-[#0B1220] border-b border-slate-200 dark:border-[#1F2E4D] flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[11px] font-bold text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider shrink-0">Sample:</span>
          {[
            'Add 2 Classic Denim Jacket',
            'Go to Inventory',
            'What is our revenue?',
            'Check business health score',
            'Hold active cart',
          ].map((cmd, idx) => (
            <button
              key={idx}
              onClick={() => executeVoiceCommand(cmd)}
              className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-xs font-medium text-slate-700 dark:text-[#F8FAFC] hover:border-[#2563EB] hover:text-blue-600 dark:hover:text-[#06B6D4] transition whitespace-nowrap"
            >
              {cmd}
            </button>
          ))}
        </div>

        {/* Command Activity Stream */}
        <div className="p-5 max-h-56 overflow-y-auto space-y-2.5 bg-slate-50/50 dark:bg-[#0B1220]">
          <div className="text-[11px] font-extrabold uppercase text-slate-500 dark:text-[#94A3B8] tracking-wider flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-blue-600 dark:text-[#06B6D4]" />
            <span>Telemetry Activity Log</span>
          </div>

          {history.map(item => (
            <div
              key={item.id}
              className="p-3 rounded-2xl bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-xs space-y-1.5 transition shadow-2xs"
            >
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-[#94A3B8]">
                <span className="font-bold text-slate-800 dark:text-[#F8FAFC] flex items-center gap-1.5">
                  <Mic className="w-3 h-3 text-blue-600 dark:text-[#06B6D4]" />
                  "{item.transcript}"
                </span>
                <span className="font-mono">{item.timestamp}</span>
              </div>
              <p className="text-slate-700 dark:text-[#94A3B8] leading-relaxed font-medium">
                {item.response}
              </p>
            </div>
          ))}
        </div>

        {/* Manual Keyboard Input Bar */}
        <form onSubmit={handleManualSubmit} className="p-4 bg-white dark:bg-[#111C30] border-t border-slate-200 dark:border-[#1F2E4D] flex gap-2">
          <input
            type="text"
            value={typedInput}
            onChange={e => setTypedInput(e.target.value)}
            placeholder="Type a voice command (e.g. Add 1 Leather Belt, Go to POS)..."
            className="flex-1 bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#94A3B8]/60 focus:outline-hidden focus:border-[#2563EB]"
          />
          <button
            type="submit"
            disabled={!typedInput.trim() || isProcessing}
            className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-2xs active:scale-98"
          >
            <span>Execute</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
