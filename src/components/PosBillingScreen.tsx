import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useVelcora } from '../context/VelcoraContext';
import {
  Search, Barcode, ShoppingCart, Trash2, Plus, Minus, CreditCard,
  Banknote, Wallet, Building2, User, PauseCircle, PlayCircle, Check,
  Printer, X, Tag, Sparkles, AlertCircle, ArrowRight, ShieldCheck,
  Layers, Package, Phone, Mail, Award, RotateCcw, QrCode, Smartphone
} from 'lucide-react';
import { Product, ProductVariant, PaymentBreakdown, CartItem } from '../types';
import { VelcoraPricingEngine } from '../utils/pricingEngine';
import { VelcoraLoyaltyEngine } from '../utils/loyaltyEngine';
import { generateBarcodeSvg } from '../utils/barcodeGenerator';
import { CustomerDigitalPassModal } from './CustomerDigitalPassModal';
import { soundEffects } from '../utils/audioEffects';
import { printThermalReceipt, printStandardInvoice, downloadReceiptAsText } from '../utils/receiptPrinter';
import { FileText, Download } from 'lucide-react';
import { useTranslation } from '../context/TranslationContext';

export const PosBillingScreen: React.FC = () => {
  const {
    products,
    cart,
    addToCart,
    removeFromCart,
    updateCartItemQty,
    clearCart,
    selectedCustomerId,
    setSelectedCustomerId,
    selectedCustomer,
    customers,
    addCustomer,
    redeemPoints,
    setRedeemPoints,
    loyaltyConfig,
    heldCarts,
    holdCurrentCart,
    resumeHeldCart,
    deleteHeldCart,
    completeSale,
    activeBusiness,
    activeSubuser,
    currency,
    shortcuts,
  } = useVelcora();
  const { t, locale, setLocale } = useTranslation();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Variant Selection Modal
  const [activeVariantProduct, setActiveVariantProduct] = useState<Product | null>(null);

  // Quick Customer Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // Held Carts Modal
  const [showHeldModal, setShowHeldModal] = useState(false);

  // Checkout / Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cashTendered, setCashTendered] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'mobile_wallet' | 'store_credit' | 'split'>('cash');
  const [splitAmounts, setSplitAmounts] = useState<{ cash: number; card: number; bank: number; wallet: number; credit: number }>({
    cash: 0,
    card: 0,
    bank: 0,
    wallet: 0,
    credit: 0,
  });

  // Receipt Modal
  const [completedReceiptSale, setCompletedReceiptSale] = useState<ReturnType<typeof completeSale> | null>(null);
  const [showDigitalPassModal, setShowDigitalPassModal] = useState(false);

  // Barcode Scanner Simulator Modal
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [mockScanInput, setMockScanInput] = useState('');

  // Dynamic customizable keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
      
      const matched = (shortcuts || []).find(s => {
        const keyMatch = e.key.toLowerCase() === s.key.toLowerCase();
        const ctrlMatch = (s.ctrlKey ?? false) === e.ctrlKey;
        const altMatch = (s.altKey ?? false) === e.altKey;
        const shiftMatch = (s.shiftKey ?? false) === e.shiftKey;
        return keyMatch && ctrlMatch && altMatch && shiftMatch;
      });

      if (!matched) return;

      const isFKey = e.key.startsWith('F') && e.key.length > 1;
      if (isInput && !isFKey && !e.altKey && !e.ctrlKey) {
        return; 
      }

      e.preventDefault();

      switch (matched.id) {
        case 'focus_search':
          searchInputRef.current?.focus();
          break;
        case 'add_customer':
          setShowAddCustomerModal(true);
          break;
        case 'pay_checkout':
          if (cart.length > 0) {
            setShowPaymentModal(true);
          }
          break;
        case 'barcode_scan':
          setShowScannerModal(true);
          break;
        case 'void_cart':
          if (cart.length > 0) {
            if (window.confirm("Are you sure you want to void this cart?")) {
              clearCart();
            }
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, cart, clearCart]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchCat;
      const matchQuery =
        (p.name || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode ? p.barcode.toLowerCase().includes(q) : false) ||
        (Array.isArray(p.variants) && p.variants.some(v => (v.sku && v.sku.toLowerCase().includes(q)) || (v.barcode && v.barcode.toLowerCase().includes(q))));
      return matchCat && matchQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  const evaluatedCart = useMemo(() => {
    return VelcoraPricingEngine.evaluateCart(cart, 0, redeemPoints, loyaltyConfig);
  }, [cart, redeemPoints, loyaltyConfig]);

  const maxLoyaltyRedeem = useMemo(() => {
    if (!selectedCustomer) return { maxPoints: 0, maxDiscountValue: 0 };
    return VelcoraLoyaltyEngine.calculateMaxRedeemable(evaluatedCart.subtotal, selectedCustomer.loyaltyPoints, loyaltyConfig);
  }, [selectedCustomer, evaluatedCart.subtotal, loyaltyConfig]);

  const pointsEarnedPreview = useMemo(() => {
    return VelcoraLoyaltyEngine.calculatePointsEarned(
      evaluatedCart.grandTotal,
      cart,
      loyaltyConfig,
      selectedCustomer?.tier
    );
  }, [evaluatedCart.grandTotal, cart, loyaltyConfig, selectedCustomer?.tier]);

  const handleProductClick = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      setActiveVariantProduct(product);
    } else {
      addToCart(product, undefined, 1);
    }
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    const newCust = {
      id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      businessId: activeBusiness.id,
      name: newCustName.trim(),
      phone: newCustPhone.trim() || '',
      loyaltyPoints: loyaltyConfig.bonusPointsForNewCustomer || 0,
      tier: 'Standard',
      totalSpent: 0,
      ordersCount: 0,
      outstandingBalance: 0,
      customFields: {},
    };
    addCustomer(newCust);
    setSelectedCustomerId(newCust.id);
    setShowAddCustomerModal(false);
    setNewCustName('');
    setNewCustPhone('');
  };

  // Payment Error / Validation state
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const cashDenominations = useMemo(() => {
    const curr = (currency || 'USD').toUpperCase();
    if (curr === 'PKR') return [100, 500, 1000, 5000];
    if (curr === 'EUR' || curr === 'GBP') return [10, 20, 50, 100];
    if (curr === 'AED' || curr === 'SAR') return [50, 100, 200, 500];
    return [20, 50, 100, 200];
  }, [currency]);

  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    setPaymentError(null);
    setCashTendered(evaluatedCart.grandTotal.toString());
    setSplitAmounts({
      cash: evaluatedCart.grandTotal,
      card: 0,
      bank: 0,
      wallet: 0,
      credit: 0,
    });
    setShowPaymentModal(true);
  };

  const handleExecuteCheckout = () => {
    setPaymentError(null);
    let payments: PaymentBreakdown[] = [];
    const now = new Date().toISOString();

    if (paymentMethod === 'cash') {
      const tender = parseFloat(cashTendered) || 0;
      if (tender < evaluatedCart.grandTotal && evaluatedCart.grandTotal > 0) {
        setPaymentError(`Cash tendered (${VelcoraPricingEngine.formatCurrency(tender, currency)}) is less than total payable (${VelcoraPricingEngine.formatCurrency(evaluatedCart.grandTotal, currency)}).`);
        return;
      }
      payments.push({
        method: 'cash',
        amount: evaluatedCart.grandTotal,
        paidAt: now,
      });
    } else if (paymentMethod === 'split') {
      const splitTotal = splitAmounts.cash + splitAmounts.card + splitAmounts.bank + splitAmounts.wallet + splitAmounts.credit;
      if (splitTotal < evaluatedCart.grandTotal && evaluatedCart.grandTotal > 0) {
        setPaymentError(`Total split payment (${VelcoraPricingEngine.formatCurrency(splitTotal, currency)}) does not cover grand total (${VelcoraPricingEngine.formatCurrency(evaluatedCart.grandTotal, currency)}).`);
        return;
      }
      if (splitAmounts.cash > 0) payments.push({ method: 'cash', amount: splitAmounts.cash, paidAt: now });
      if (splitAmounts.card > 0) payments.push({ method: 'card', amount: splitAmounts.card, reference: 'CARD-SPLIT', paidAt: now });
      if (splitAmounts.bank > 0) payments.push({ method: 'bank_transfer', amount: splitAmounts.bank, reference: 'BANK-TRANSFER', paidAt: now });
      if (splitAmounts.wallet > 0) payments.push({ method: 'mobile_wallet', amount: splitAmounts.wallet, paidAt: now });
      if (splitAmounts.credit > 0) payments.push({ method: 'store_credit', amount: splitAmounts.credit, paidAt: now });
    } else {
      payments.push({
        method: paymentMethod,
        amount: evaluatedCart.grandTotal,
        reference: paymentMethod === 'card' ? 'CARD-TERMINAL-01' : undefined,
        paidAt: now,
      });
    }

    const saleResult = completeSale(payments, 'POS Checkout');
    setShowPaymentModal(false);
    setCompletedReceiptSale(saleResult);
  };

  const tenderNumber = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, tenderNumber - evaluatedCart.grandTotal);

  return (
    <div id="velcora-pos-billing-screen" className="w-full max-w-7xl 2xl:max-w-[1720px] mx-auto flex flex-col-reverse lg:grid lg:grid-cols-12 gap-4 2xl:gap-6">
      {/* LEFT 7-8 COLS: PRODUCT CATALOG */}
      <div className="lg:col-span-7 xl:col-span-8 2xl:col-span-8 flex flex-col gap-3.5">
        {/* Search Bar */}
        <div className="bg-white dark:bg-[#111C30] rounded-2xl p-3 border border-slate-200 dark:border-[#1F2E4D] flex items-center justify-between gap-2.5 shadow-2xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 dark:text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search products or scan barcode (F2)..."
              className="w-full pl-10 pr-14 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-xs sm:text-sm text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#94A3B8]/60 focus:border-primary focus:ring-0 focus:outline-hidden transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-9 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#94A3B8] hover:text-slate-700 dark:hover:text-[#F8FAFC] text-xs px-1"
              >
                ✕
              </button>
            )}
            <kbd className="hidden sm:inline absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-[#111C30] text-slate-500 dark:text-[#94A3B8] border border-slate-200 dark:border-[#1F2E4D] rounded-md shadow-2xs">
              F2
            </kbd>
          </div>

          <button
            onClick={() => setShowScannerModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#152644] hover:bg-slate-200 dark:hover:bg-[#1E2E4A] text-slate-800 dark:text-[#F8FAFC] border border-slate-200 dark:border-[#1F2E4D] text-xs font-bold transition shadow-2xs"
          >
            <Barcode className="w-3.5 h-3.5 text-blue-600 dark:text-[#06B6D4]" />
            <span>Scanner</span>
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-primary text-white shadow-2xs'
                  : 'bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-[#1E2E4A]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-3 2xl:gap-3.5 max-h-[calc(100vh-230px)] 2xl:max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 dark:text-[#94A3B8]">
              <Package className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-[#94A3B8] stroke-1" />
              <p className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8]">No products found</p>
            </div>
          ) : (
            filteredProducts.map(prod => {
              const isOutOfStock = !prod.isService && prod.stock <= 0;
              const hasVariants = prod.variants && prod.variants.length > 0;

              return (
                <div
                  key={prod.id}
                  onClick={() => !isOutOfStock && handleProductClick(prod)}
                  className={`bg-white dark:bg-[#111C30] rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer overflow-hidden shadow-2xs hover:shadow-xs ${
                    isOutOfStock
                      ? 'opacity-40 border-slate-200 dark:border-[#1F2E4D] cursor-not-allowed'
                      : 'border-slate-200 dark:border-[#1F2E4D] hover:border-primary'
                  }`}
                >
                  {prod.imageUrl && (
                    <div className="w-full h-24 sm:h-28 2xl:h-32 overflow-hidden relative border-b border-slate-200 dark:border-[#1F2E4D] bg-slate-50 dark:bg-[#0B1220]">
                      <img
                        src={prod.imageUrl}
                        alt={prod.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="%2394A3B8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 12v10"/></svg>';
                        }}
                      />
                    </div>
                  )}

                  <div className="p-3 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-[#94A3B8] truncate">
                          {prod.category}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {hasVariants && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-primary-light text-primary border border-primary/20">
                              {prod.variants.length} Options
                            </span>
                          )}
                          {!prod.isService ? (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                              isOutOfStock
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                                : prod.stock <= (prod.minStock ?? 5)
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            }`}>
                              {isOutOfStock ? 'Out of stock' : `${prod.stock} in stock`}
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                              Service
                            </span>
                          )}
                        </div>
                      </div>

                      <h4 className="font-bold text-xs text-slate-900 dark:text-[#F8FAFC] line-clamp-2 leading-snug">
                        {prod.name}
                      </h4>
                      <p className="text-[9px] font-mono text-slate-400 dark:text-[#94A3B8]/60 mt-0.5">{prod.sku}</p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-[#1F2E4D] flex items-center justify-between">
                      <div>
                        <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-[#F8FAFC]">
                          {VelcoraPricingEngine.formatCurrency(prod.sellingPrice, currency)}
                        </span>
                      </div>
                      <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition">
                        <Plus className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT 4-5 COLS: CART LEDGER & CHECKOUT */}
      <div className="lg:col-span-5 xl:col-span-4 2xl:col-span-4 flex flex-col gap-3">
        <div className="bg-white dark:bg-[#111C30] rounded-3xl border border-slate-200 dark:border-[#1F2E4D] flex flex-col h-full overflow-hidden shadow-2xs">
          {/* Cart Header */}
          <div className="p-3.5 border-b border-slate-200 dark:border-[#1F2E4D] flex items-center justify-between bg-slate-50 dark:bg-[#0B1220]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary p-0.5 shadow-2xs">
                <div className="w-full h-full rounded-[10px] bg-white dark:bg-[#111C30] flex items-center justify-center text-slate-900 dark:text-[#F8FAFC]">
                  <ShoppingCart className="w-3.5 h-3.5 text-primary dark:text-white" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-[#F8FAFC]">Register Cart</h3>
                <span className="text-[10px] text-slate-500 dark:text-[#94A3B8] font-semibold">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)} items
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {heldCarts.length > 0 && (
                <button
                  onClick={() => setShowHeldModal(true)}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 hover:bg-amber-100 flex items-center gap-1"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  <span>{heldCarts.length}</span>
                </button>
              )}

              {cart.length > 0 && (
                <>
                  <button
                    onClick={() => holdCurrentCart()}
                    className="p-1.5 rounded-xl text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC] transition"
                    title={t('hold_cart')}
                  >
                    <PauseCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={clearCart}
                    className="p-1.5 rounded-xl text-rose-500 dark:text-rose-400 hover:text-rose-700 transition"
                    title="Clear Cart"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Customer Row */}
          <div className="p-3 bg-slate-50 dark:bg-[#0B1220] border-b border-slate-200 dark:border-[#1F2E4D] flex items-center justify-between gap-2">
            <select
              value={selectedCustomerId || ''}
              onChange={e => {
                setSelectedCustomerId(e.target.value || null);
                setRedeemPoints(0);
              }}
              className="flex-1 text-xs bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] rounded-xl px-3 py-1.5 text-slate-900 dark:text-[#F8FAFC] focus:outline-hidden focus:border-primary shadow-2xs font-medium"
            >
              <option value="">👤 Walk-in Customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.loyaltyPoints} pts)
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowAddCustomerModal(true)}
              className="p-2 rounded-xl border border-slate-200 dark:border-[#1F2E4D] bg-white dark:bg-[#111C30] hover:bg-slate-100 dark:hover:bg-[#1E2E4A] text-slate-600 dark:text-[#94A3B8] shadow-2xs"
              title="Add Customer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Loyalty points widget */}
          {selectedCustomer && selectedCustomer.loyaltyPoints > 0 && loyaltyConfig.enabled && (
            <div className="px-3.5 py-2 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700 flex items-center justify-between text-xs">
              <span className="text-slate-800 dark:text-zinc-300 font-bold">{selectedCustomer.loyaltyPoints} pts available</span>
              {maxLoyaltyRedeem.maxPoints > 0 ? (
                <button
                  onClick={() => setRedeemPoints(redeemPoints > 0 ? 0 : maxLoyaltyRedeem.maxPoints)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition shadow-2xs ${
                    redeemPoints > 0 ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-slate-900' : 'border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 bg-white dark:bg-zinc-900'
                  }`}
                >
                  {redeemPoints > 0 ? `Redeemed -${currency || '$'}${(evaluatedCart.loyaltyDiscount ?? 0).toFixed(2)}` : `Redeem (${maxLoyaltyRedeem.maxPoints} pts)`}
                </button>
              ) : null}
            </div>
          )}

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[320px] lg:max-h-[calc(100vh-450px)] 2xl:max-h-[calc(100vh-480px)] min-h-[160px] lg:min-h-[260px]">
            {cart.length === 0 ? (
              <div className="py-10 text-center text-slate-400 dark:text-[#64748B]">
                <ShoppingCart className="w-7 h-7 mx-auto mb-1.5 text-slate-300 stroke-1" />
                <p className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8]">Cart is empty</p>
              </div>
            ) : (
              cart.map((item, idx) => {
                const lineNet = item.unitPrice * item.quantity - item.discount;
                return (
                  <div
                    key={`${item.productId}-${item.variantId || 'main'}-${idx}`}
                    className="p-2.5 rounded-2xl border border-slate-200 dark:border-[#1F2E4D] bg-slate-50/50 dark:bg-[#0B1220] flex flex-col gap-1.5 text-xs shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h5 className="font-bold text-slate-800 dark:text-[#F8FAFC] truncate">{item.name}</h5>
                        <div className="text-[10px] text-slate-400 dark:text-[#94A3B8]/80 font-mono">
                          {VelcoraPricingEngine.formatCurrency(item.unitPrice, currency)} × {item.quantity}
                        </div>
                      </div>
                      <span className="font-extrabold text-slate-900 dark:text-[#F8FAFC]">
                        {VelcoraPricingEngine.formatCurrency(lineNet, currency)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-[#1F2E4D]/60">
                      <div className="flex items-center gap-1 bg-white dark:bg-[#152644] border border-slate-200 dark:border-[#1F2E4D] rounded-xl p-0.5">
                        <button
                          onClick={() => updateCartItemQty(item.productId, item.variantId, item.quantity - 1)}
                          className="w-5 h-5 flex items-center justify-center text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="text-xs font-bold px-1 text-slate-800 dark:text-white">{item.quantity}</span>
                        <button
                          onClick={() => updateCartItemQty(item.productId, item.variantId, item.quantity + 1)}
                          className="w-5 h-5 flex items-center justify-center text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.productId, item.variantId)}
                        className="text-slate-400 hover:text-rose-500 p-1 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Summary & Pay Button */}
          <div className="p-4 bg-slate-50 dark:bg-[#0B1220]/60 border-t border-slate-200 dark:border-[#1F2E4D] rounded-b-3xl space-y-2.5">
            <div className="space-y-1 text-xs text-slate-600 dark:text-[#94A3B8]">
              <div className="flex justify-between">
                <span>{t('subtotal')}</span>
                <span className="font-bold text-slate-800 dark:text-[#F8FAFC]">
                  {VelcoraPricingEngine.formatCurrency(evaluatedCart.subtotal, currency)}
                </span>
              </div>
              {evaluatedCart.totalDiscount > 0 && (
                <div className="flex justify-between text-slate-900 dark:text-[#F8FAFC] font-bold">
                  <span>{t('discount')}</span>
                  <span>-{VelcoraPricingEngine.formatCurrency(evaluatedCart.totalDiscount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-slate-900 dark:text-[#F8FAFC] pt-2 border-t border-slate-200 dark:border-[#1F2E4D]">
                <span>Total Payable</span>
                <span className="font-black text-base text-slate-900 dark:text-[#F8FAFC]">
                  {VelcoraPricingEngine.formatCurrency(evaluatedCart.grandTotal, currency)}
                </span>
              </div>
            </div>

            <button
              disabled={cart.length === 0}
              onClick={handleOpenPayment}
              className={`w-full py-3 px-4 rounded-2xl text-white dark:text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-xs ${
                cart.length === 0
                  ? 'bg-slate-200 dark:bg-[#152644]/40 text-slate-400 dark:text-[#94A3B8]/40 cursor-not-allowed'
                  : 'bg-slate-900 dark:bg-white hover:opacity-90 shadow-sm active:scale-98'
              }`}
            >
              <span>Pay Now</span>
              <span>•</span>
              <span>{VelcoraPricingEngine.formatCurrency(evaluatedCart.grandTotal, currency)}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: VARIANT SELECTION */}
      {activeVariantProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111C30] rounded-3xl max-w-md w-full p-5 border border-slate-200 dark:border-[#1F2E4D] shadow-2xl space-y-4 text-slate-800 dark:text-[#F8FAFC]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1F2E4D]">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">{activeVariantProduct.name}</h3>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">Select Option</p>
              </div>
              <button
                onClick={() => setActiveVariantProduct(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#152644] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {activeVariantProduct.variants.map(variant => (
                <button
                  key={variant.id}
                  disabled={variant.stock <= 0}
                  onClick={() => {
                    addToCart(activeVariantProduct, variant.id, 1);
                    setActiveVariantProduct(null);
                  }}
                  className="w-full text-left p-3 rounded-2xl border border-slate-200 dark:border-[#1F2E4D] bg-slate-50/50 dark:bg-[#0B1220] hover:bg-slate-100/60 dark:hover:bg-[#1E2E4A] flex items-center justify-between transition text-xs shadow-2xs group"
                >
                  <div>
                    <div className="font-bold text-slate-800 dark:text-[#F8FAFC]/90 group-hover:text-slate-950 dark:group-hover:text-white">
                      {Object.entries(variant.attributes).map(([k, v]) => `${k}: ${v}`).join(' • ')}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-[#94A3B8]/60 font-mono mt-0.5">SKU: {variant.sku}</div>
                  </div>
                  <div className="text-right font-black text-sm text-slate-900 dark:text-[#F8FAFC]">
                    {VelcoraPricingEngine.formatCurrency(variant.sellingPrice, currency)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QUICK ADD CUSTOMER */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateCustomer}
            className="bg-white dark:bg-[#111C30] rounded-3xl max-w-sm w-full p-5 border border-slate-200 dark:border-[#1F2E4D] shadow-2xl space-y-4 text-slate-800 dark:text-[#F8FAFC]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1F2E4D]">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">Quick Add Customer</h3>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#152644] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-[#94A3B8] font-bold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  placeholder="e.g. Jordan Miller"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-800 dark:text-[#F8FAFC] focus:border-slate-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-[#94A3B8] font-bold mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={e => setNewCustPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-800 dark:text-[#F8FAFC] focus:border-slate-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#1F2E4D]">
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-[#152644]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-sm hover:opacity-95"
              >
                Save Customer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: PAYMENT */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111C30] rounded-3xl max-w-md w-full p-5 sm:p-6 border border-slate-200 dark:border-[#1F2E4D] shadow-2xl space-y-4 text-slate-800 dark:text-[#F8FAFC] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1F2E4D]">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">POS Payment</h3>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  Payable:{' '}
                  <span className="font-black text-slate-900 dark:text-[#F8FAFC]">
                    {VelcoraPricingEngine.formatCurrency(evaluatedCart.grandTotal, currency)}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#152644]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error / Validation Banner */}
            {paymentError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 my-2">
              {[
                { id: 'cash', label: t('cash'), icon: Banknote },
                { id: 'card', label: t('card'), icon: CreditCard },
                { id: 'bank_transfer', label: 'Bank', icon: Building2 },
                { id: 'mobile_wallet', label: 'Wallet', icon: Wallet },
                { id: 'store_credit', label: 'Credit', icon: User },
                { id: 'split', label: 'Split', icon: Layers },
              ].map(m => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setPaymentMethod(m.id as any);
                      setPaymentError(null);
                    }}
                    className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1.5 text-center transition shadow-2xs ${
                      paymentMethod === m.id
                        ? 'border-slate-800 dark:border-white bg-slate-100 dark:bg-[#152644] text-slate-900 dark:text-white font-bold ring-2 ring-slate-800/10 dark:ring-white/10'
                        : 'border-slate-200 dark:border-[#1F2E4D] text-slate-600 dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-[#1E2E4A]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px] font-semibold">{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Cash Input */}
            {paymentMethod === 'cash' && (
              <div className="bg-slate-50 dark:bg-[#0B1220] p-4 rounded-2xl border border-slate-200 dark:border-[#1F2E4D] space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Cash Tendered ({currency || '$'})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cashTendered}
                    onChange={e => {
                      setCashTendered(e.target.value);
                      setPaymentError(null);
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#1F2E4D] text-lg font-mono font-black text-slate-900 dark:text-white bg-white dark:bg-[#152644] focus:border-slate-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex gap-2">
                  {cashDenominations.map(den => (
                    <button
                      key={den}
                      onClick={() => {
                        setCashTendered(den.toString());
                        setPaymentError(null);
                      }}
                      className="flex-1 py-1.5 rounded-xl bg-white dark:bg-[#152644] border border-slate-200 dark:border-[#1F2E4D] text-xs font-bold text-slate-800 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1E2E4A] shadow-2xs"
                    >
                      {currency || '$'}{den}
                    </button>
                  ))}
                </div>

                {changeDue > 0 && (
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#152644] border border-slate-200 dark:border-[#1F2E4D] text-slate-800 dark:text-[#94A3B8] text-xs font-bold flex justify-between items-center">
                    <span>Change Due:</span>
                    <span className="font-mono text-sm">{VelcoraPricingEngine.formatCurrency(changeDue, currency)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Split Payment Input Fields */}
            {paymentMethod === 'split' && (
              <div className="bg-slate-50 dark:bg-[#0B1220] p-4 rounded-2xl border border-slate-200 dark:border-[#1F2E4D] space-y-3 text-xs">
                <h4 className="font-bold text-slate-800 dark:text-[#F8FAFC]">Enter Split Amounts</h4>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-[#94A3B8] mb-0.5">Cash</label>
                    <input
                      type="number"
                      step="0.01"
                      value={splitAmounts.cash || ''}
                      onChange={e => {
                        setSplitAmounts(prev => ({ ...prev, cash: parseFloat(e.target.value) || 0 }));
                        setPaymentError(null);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#152644] border border-slate-200 dark:border-[#1F2E4D] font-mono text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-[#94A3B8] mb-0.5">Card</label>
                    <input
                      type="number"
                      step="0.01"
                      value={splitAmounts.card || ''}
                      onChange={e => {
                        setSplitAmounts(prev => ({ ...prev, card: parseFloat(e.target.value) || 0 }));
                        setPaymentError(null);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#152644] border border-slate-200 dark:border-[#1F2E4D] font-mono text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-[#94A3B8] mb-0.5">Bank Transfer</label>
                    <input
                      type="number"
                      step="0.01"
                      value={splitAmounts.bank || ''}
                      onChange={e => {
                        setSplitAmounts(prev => ({ ...prev, bank: parseFloat(e.target.value) || 0 }));
                        setPaymentError(null);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#152644] border border-slate-200 dark:border-[#1F2E4D] font-mono text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-[#94A3B8] mb-0.5">Mobile Wallet</label>
                    <input
                      type="number"
                      step="0.01"
                      value={splitAmounts.wallet || ''}
                      onChange={e => {
                        setSplitAmounts(prev => ({ ...prev, wallet: parseFloat(e.target.value) || 0 }));
                        setPaymentError(null);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#152644] border border-slate-200 dark:border-[#1F2E4D] font-mono text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-[#94A3B8] mb-0.5">Store Credit</label>
                    <input
                      type="number"
                      step="0.01"
                      value={splitAmounts.credit || ''}
                      onChange={e => {
                        setSplitAmounts(prev => ({ ...prev, credit: parseFloat(e.target.value) || 0 }));
                        setPaymentError(null);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#152644] border border-slate-200 dark:border-[#1F2E4D] font-mono text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {(() => {
                  const currentSplitTotal = splitAmounts.cash + splitAmounts.card + splitAmounts.bank + splitAmounts.wallet + splitAmounts.credit;
                  const diff = currentSplitTotal - evaluatedCart.grandTotal;
                  return (
                    <div className={`p-2.5 rounded-xl border text-xs font-bold flex justify-between items-center ${
                      diff >= 0 
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                        : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                    }`}>
                      <span>{diff >= 0 ? 'Total Split Paid:' : 'Remaining Balance:'}</span>
                      <span className="font-mono">{VelcoraPricingEngine.formatCurrency(diff >= 0 ? currentSplitTotal : Math.abs(diff), currency)}</span>
                    </div>
                  );
                })()}
              </div>
            )}

            <button
              onClick={handleExecuteCheckout}
              className="w-full py-3 rounded-2xl bg-slate-900 dark:bg-white hover:opacity-95 text-white dark:text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-sm active:scale-98"
            >
              <Check className="w-4 h-4" />
              <span>Confirm & Generate Receipt</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL: RECEIPT */}
      {completedReceiptSale && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111C30] rounded-3xl max-w-sm w-full p-5 border border-slate-200 dark:border-[#1F2E4D] shadow-2xl space-y-4 text-slate-800 dark:text-[#F8FAFC] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1F2E4D]">
              <div className="flex items-center gap-2 text-slate-900 dark:text-[#F8FAFC] font-bold text-xs sm:text-sm">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Sale Completed</span>
              </div>
              <button
                onClick={() => setCompletedReceiptSale(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt container */}
            <div className="p-4 bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] rounded-2xl font-mono text-[11px] text-slate-700 dark:text-[#94A3B8] space-y-2.5 shadow-inner">
              <div className="text-center border-b border-dashed border-slate-200 dark:border-[#1F2E4D] pb-2.5">
                <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">{activeBusiness.name}</div>
                <div className="text-[10px] text-slate-500 dark:text-[#94A3B8]/60">{activeBusiness.address}</div>
              </div>

              <div className="flex justify-between text-[10px] text-slate-500 dark:text-[#94A3B8]/60">
                <span>Invoice: {completedReceiptSale.invoiceNumber}</span>
                <span>{new Date(completedReceiptSale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              <div className="space-y-1.5 py-1">
                {completedReceiptSale.items.map((it, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="truncate max-w-[160px]">{it.quantity}x {it.name}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{currency || '$'}{((it.unitPrice || 0) * (it.quantity || 1) - (it.discount || 0)).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-dashed border-slate-200 dark:border-[#1F2E4D] space-y-0.5">
                <div className="flex justify-between font-extrabold text-xs text-slate-900 dark:text-white">
                  <span>TOTAL:</span>
                  <span className="text-slate-950 dark:text-white font-black">{currency || '$'}{(completedReceiptSale.grandTotal ?? 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Barcode on receipt */}
              <div className="pt-2 text-center flex flex-col items-center">
                <div
                  className="bg-white p-2 rounded-xl shadow-xs"
                  dangerouslySetInnerHTML={{
                    __html: generateBarcodeSvg(completedReceiptSale.invoiceNumber, 180, 28),
                  }}
                />
                <p className="text-[9px] text-slate-400 dark:text-[#94A3B8]/50 mt-1.5">{activeBusiness.receiptFooter}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowDigitalPassModal(true)}
                className="w-full py-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-[#06B6D4] border border-blue-200 dark:border-blue-800 text-xs font-bold flex items-center justify-center gap-2 transition shadow-2xs"
              >
                <QrCode className="w-4 h-4" />
                <span>📱 Customer Digital QR Pass (Zero-Paper)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    printThermalReceipt({
                      sale: completedReceiptSale,
                      business: activeBusiness,
                      currency,
                      cashierName: activeSubuser?.name || 'Cashier',
                    })
                  }
                  className="py-2.5 px-2 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Thermal POS</span>
                </button>

                <button
                  onClick={() =>
                    printStandardInvoice({
                      sale: completedReceiptSale,
                      business: activeBusiness,
                      currency,
                      cashierName: activeSubuser?.name || 'Cashier',
                    })
                  }
                  className="py-2.5 px-2 rounded-2xl bg-slate-900 dark:bg-white hover:opacity-90 text-white dark:text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-2xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>A4 Invoice</span>
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() =>
                    downloadReceiptAsText({
                      sale: completedReceiptSale,
                      business: activeBusiness,
                      currency,
                    })
                  }
                  className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-[#1F2E4D] text-xs font-bold text-slate-700 dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-[#152644] flex items-center justify-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Export TXT</span>
                </button>
                <button
                  onClick={() => setCompletedReceiptSale(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#152644] border border-slate-200 dark:border-[#1F2E4D] text-xs font-bold text-slate-800 dark:text-[#F8FAFC] hover:bg-slate-200 dark:hover:bg-[#1E2E4A] transition"
                >
                  New Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER DIGITAL QR PASS MODAL */}
      <CustomerDigitalPassModal
        isOpen={showDigitalPassModal}
        onClose={() => setShowDigitalPassModal(false)}
        sale={completedReceiptSale}
        businessName={activeBusiness.name}
        currency={currency}
      />

      {/* MODAL: BARCODE SCANNER SIMULATOR */}
      {showScannerModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111C30] rounded-3xl max-w-sm w-full p-5 border border-slate-200 dark:border-[#1F2E4D] shadow-2xl space-y-4 text-slate-800 dark:text-[#F8FAFC]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1F2E4D]">
              <div className="flex items-center gap-2">
                <Barcode className="w-4 h-4 text-slate-800 dark:text-[#F8FAFC]" />
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">Barcode Scanner</h3>
              </div>
              <button
                onClick={() => setShowScannerModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-center">
              <div className="w-full h-28 bg-slate-50 dark:bg-[#0B1220] rounded-2xl border border-slate-200 dark:border-[#1F2E4D] flex flex-col items-center justify-center relative overflow-hidden">
                <div className="w-44 h-0.5 bg-slate-500 dark:bg-[#94A3B8]/60 animate-pulse" />
                <span className="text-[10px] font-mono text-slate-600 dark:text-[#94A3B8]/60 mt-2 font-semibold">Optical Sensor Active</span>
              </div>

              <div>
                <input
                  type="text"
                  value={mockScanInput}
                  onChange={e => setMockScanInput(e.target.value)}
                  placeholder="Scan or enter barcode / SKU..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-xs font-mono text-slate-800 dark:text-[#F8FAFC] focus:border-slate-500 focus:outline-hidden"
                />
              </div>

              <div className="flex flex-wrap gap-1.5 justify-center">
                {products.slice(0, 3).map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      soundEffects.playScanBeep();
                      addToCart(p);
                      setShowScannerModal(false);
                    }}
                    className="px-2.5 py-1 bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] rounded-lg text-[10px] font-mono text-slate-800 dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-[#152644] shadow-2xs"
                  >
                    Scan: {p.barcode}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-[#1F2E4D] flex justify-end">
              <button
                onClick={() => {
                  const match = products.find(p => p.barcode === mockScanInput || p.sku === mockScanInput);
                  if (match) {
                    soundEffects.playScanBeep();
                    addToCart(match);
                    setShowScannerModal(false);
                    setMockScanInput('');
                  }
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-bold hover:opacity-95 shadow-sm"
              >
                Scan & Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
