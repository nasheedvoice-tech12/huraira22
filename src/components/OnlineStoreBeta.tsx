import React, { useState, useMemo } from 'react';
import { useVelcora } from '../context/VelcoraContext';
import {
  Globe, ShoppingBag, Eye, ExternalLink, Sparkles,
  CheckCircle2, ArrowRight, ShieldCheck, Tag, Plus, Minus, X,
  Search, Check
} from 'lucide-react';
import { Product } from '../types';
import { VelcoraPricingEngine } from '../utils/pricingEngine';
import { resolveActivePlan, isFeatureAllowed } from '../utils/planLimitsEngine';

export const OnlineStoreBeta: React.FC = () => {
  const {
    products,
    activeBusiness,
    currency,
    addNewSaleOrder,
    activeSubscription,
    subscriptionPlans,
    openCheckoutModal,
  } = useVelcora();

  // Dynamic Plan Feature Check
  const currentPlan = resolveActivePlan(activeSubscription, subscriptionPlans, activeBusiness);
  const isBetaStoreUnlocked = isFeatureAllowed(currentPlan, 'beta_store');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [onlineCart, setOnlineCart] = useState<{ product: Product; qty: number }[]>([]);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Customer order form
  const [custName, setCustName] = useState('Alex Rivera');
  const [custPhone, setCustPhone] = useState('+1 (555) 888-9999');
  const [custAddress, setCustAddress] = useState('742 Evergreen Terrace');
  const [custNotes, setCustNotes] = useState('Please leave at front door');

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [products]);

  const onlineProducts = useMemo(() => {
    return products.filter(p => {
      const matchStock = p.onlineStoreActive !== false && p.stock > 0;
      const matchCat = selectedCategory === 'ALL' || (p.category || 'General') === selectedCategory;
      const matchSearch =
        !searchQuery.trim() ||
        (p.name || '').toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (p.category || '').toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchStock && matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const cartTotal = onlineCart.reduce((sum, item) => sum + item.product.sellingPrice * item.qty, 0);
  const cartItemCount = onlineCart.reduce((sum, item) => sum + item.qty, 0);

  const addToOnlineCart = (prod: Product) => {
    setOnlineCart(prev => {
      const exists = prev.find(i => i.product.id === prod.id);
      if (exists) {
        return prev.map(i => i.product.id === prod.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { product: prod, qty: 1 }];
    });
  };

  const updateCartQty = (prodId: string, newQty: number) => {
    if (newQty <= 0) {
      setOnlineCart(prev => prev.filter(i => i.product.id !== prodId));
    } else {
      setOnlineCart(prev => prev.map(i => i.product.id === prodId ? { ...i, qty: newQty } : i));
    }
  };

  const handlePlaceOnlineOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (onlineCart.length === 0) return;

    const newOrder = {
      id: `so-web-${Date.now()}`,
      orderNumber: `WEB-${Math.floor(1000 + Math.random() * 9000)}`,
      businessId: activeBusiness.id,
      customerId: 'cust-web-1',
      customerName: custName.trim(),
      paymentStatus: 'unpaid' as const,
      status: 'confirmed' as const,
      items: onlineCart.map(i => ({
        productId: i.product.id,
        name: i.product.name,
        sku: i.product.sku || 'SKU-WEB',
        unitPrice: i.product.sellingPrice,
        costPrice: i.product.costPrice || i.product.sellingPrice * 0.5,
        quantity: i.qty,
        discount: 0,
        discountPercent: 0,
        taxRate: 0,
        taxAmount: 0,
      })),
      subtotal: cartTotal,
      taxTotal: 0,
      discountTotal: 0,
      grandTotal: cartTotal,
      advanceDeposit: 0,
      deliveryDeadline: new Date(Date.now() + 86400000 * 2).toISOString(),
      createdAt: new Date().toISOString(),
    };

    addNewSaleOrder(newOrder);
    setOnlineCart([]);
    setShowCheckoutModal(false);
    setOrderSuccess(true);
    setTimeout(() => setOrderSuccess(false), 5000);
  };

  const copyStoreLink = () => {
    const slug = (activeBusiness?.name || 'velcora').toLowerCase().replace(/[^a-z0-9]/g, '-');
    const url = `https://velcora.shop/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!isBetaStoreUnlocked) {
    return (
      <div id="velcora-online-store" className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-white dark:bg-[#111C30] rounded-3xl border border-slate-200 dark:border-[#1F2E4D] p-8 sm:p-12 text-center shadow-xl relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

          <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto shadow-inner">
            <Globe className="w-10 h-10" />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <span className="px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-black uppercase tracking-wider">
              Feature Locked on {currentPlan.name}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Launch Your Branded Web Storefront
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Online Storefront is a Pro feature. Upgrade your subscription to publish a responsive web store, accept direct consumer orders, and sync orders directly into your POS register in real-time.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left py-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] space-y-1">
              <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Custom Domain Link</span>
              </div>
              <p className="text-[11px] text-slate-500">velcora.shop/your-business</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] space-y-1">
              <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Live POS Cart Sync</span>
              </div>
              <p className="text-[11px] text-slate-500">Orders appear on register</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] space-y-1">
              <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Zero Transaction Cuts</span>
              </div>
              <p className="text-[11px] text-slate-500">Keep 100% of order revenue</p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={() => openCheckoutModal('subscriptions', 'tier_pro')}
              className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white font-extrabold text-sm flex items-center gap-2 transition shadow-lg shadow-primary/25 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Upgrade to Pro to Unlock Storefront</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="velcora-online-store" className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#111C30] p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#2563EB] p-0.5 shadow-2xs">
            <div className="w-full h-full rounded-[14px] bg-white dark:bg-[#111C30] flex items-center justify-center text-[#2563EB] dark:text-[#06B6D4]">
              <Globe className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-[#F8FAFC]">Online Storefront (Beta)</h2>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">
              Live link: <span className="font-mono text-[#2563EB] dark:text-[#06B6D4] font-bold">velcora.shop/{(activeBusiness?.name || 'velcora').toLowerCase().replace(/[^a-z0-9]/g, '-')}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyStoreLink}
            className="px-4 py-2 rounded-2xl bg-slate-50 dark:bg-[#0B1220] hover:bg-slate-100 dark:hover:bg-[#1E2E4A] border border-slate-200 dark:border-[#1F2E4D] text-xs font-bold text-slate-700 dark:text-[#F8FAFC] flex items-center gap-1.5 transition"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <ExternalLink className="w-4 h-4 text-[#2563EB] dark:text-[#06B6D4]" />}
            <span>{copiedLink ? 'Link Copied' : 'Share Store Link'}</span>
          </button>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2563EB] dark:text-[#06B6D4] bg-slate-100 dark:bg-[#152644] border border-slate-200 dark:border-[#1F2E4D] px-3 py-1.5 rounded-2xl">
            <span className="w-2 h-2 rounded-full bg-[#2563EB] dark:bg-[#06B6D4] animate-pulse" />
            Online & Ready
          </span>
        </div>
      </div>

      {orderSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Customer order received and synced directly to your Sales Orders queue.</span>
          </div>
        </div>
      )}

      {/* STOREFRONT SIMULATOR CONTAINER */}
      <div className="bg-white dark:bg-[#111C30] rounded-3xl p-5 sm:p-7 text-slate-800 dark:text-[#F8FAFC] border border-slate-200 dark:border-[#1F2E4D] shadow-2xs space-y-6">
        {/* Storefront Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-[#1F2E4D]">
          <div>
            <span className="text-[10px] uppercase font-extrabold text-[#2563EB] dark:text-[#06B6D4] tracking-wider bg-slate-50 dark:bg-[#0B1220] px-2.5 py-1 rounded-full border border-slate-200 dark:border-[#1F2E4D]">
              {(activeBusiness?.industry || 'RETAIL').toUpperCase()} • VERIFIED STORE
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold mt-2 text-slate-900 dark:text-[#F8FAFC]">{activeBusiness.name}</h1>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1 font-medium max-w-md">{activeBusiness.address} • Tel: {activeBusiness.phone}</p>
          </div>

          {/* Cart Widget */}
          <div className="bg-slate-50 dark:bg-[#0B1220] p-3.5 rounded-2xl border border-slate-200 dark:border-[#1F2E4D] flex items-center justify-between sm:justify-start gap-3.5 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#152644] text-[#2563EB] dark:text-[#06B6D4] flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-[#F8FAFC]">{cartItemCount} item{cartItemCount === 1 ? '' : 's'} in Bag</span>
            </div>
            {onlineCart.length > 0 && (
              <button
                onClick={() => setShowCheckoutModal(true)}
                className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-bold shadow-2xs transition active:scale-98"
              >
                Checkout ({VelcoraPricingEngine.formatCurrency(cartTotal, currency)})
              </button>
            )}
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Category tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-[#2563EB] text-white shadow-2xs'
                    : 'bg-slate-50 dark:bg-[#0B1220] text-slate-600 dark:text-[#94A3B8] border border-slate-200 dark:border-[#1F2E4D] hover:text-[#2563EB] dark:hover:text-[#F8FAFC]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search store catalog..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-xs text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#94A3B8]/60 font-medium focus:border-[#2563EB] focus:outline-hidden"
            />
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 2xl:gap-5">
          {onlineProducts.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 dark:text-[#94A3B8]">
              <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600 stroke-1" />
              <p className="text-sm font-bold text-slate-700 dark:text-[#F8FAFC]">No items available</p>
              <p className="text-xs text-slate-400 dark:text-[#94A3B8]/80 font-medium">Try changing your search or category filter</p>
            </div>
          ) : (
            onlineProducts.map(prod => {
              const inCart = onlineCart.find(i => i.product.id === prod.id);
              return (
                <div
                  key={prod.id}
                  className="bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] rounded-2xl overflow-hidden flex flex-col justify-between hover:border-slate-300 dark:hover:border-[#2A3F66] transition group shadow-2xs"
                >
                  {prod.imageUrl && (
                    <div className="w-full h-32 overflow-hidden bg-slate-50 dark:bg-[#111C30] border-b border-slate-200 dark:border-[#1F2E4D]">
                      <img
                        src={prod.imageUrl}
                        alt={prod.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=150&q=80';
                        }}
                      />
                    </div>
                  )}

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-extrabold text-[#2563EB] dark:text-[#06B6D4] bg-slate-50 dark:bg-[#152644] px-2 py-0.5 rounded-md">{prod.category}</span>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-[#F8FAFC] mt-1.5 group-hover:text-[#2563EB] dark:group-hover:text-[#06B6D4] transition">
                        {prod.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1 line-clamp-2 leading-relaxed font-medium">
                        {prod.description || 'Premium retail product available for online reservation & delivery.'}
                      </p>
                    </div>

                    <div className="mt-4 pt-3.5 border-t border-slate-200 dark:border-[#1F2E4D] flex items-center justify-between">
                      <div>
                        <span className="text-base font-extrabold text-slate-900 dark:text-[#F8FAFC]">
                          {VelcoraPricingEngine.formatCurrency(prod.sellingPrice, currency)}
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold">In Stock</span>
                      </div>

                      {inCart ? (
                        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] rounded-xl p-1">
                          <button
                            onClick={() => updateCartQty(prod.id, inCart.qty - 1)}
                            className="w-6 h-6 flex items-center justify-center text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-[#152644] font-bold"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-extrabold px-1.5 text-slate-900 dark:text-[#F8FAFC]">{inCart.qty}</span>
                          <button
                            onClick={() => updateCartQty(prod.id, inCart.qty + 1)}
                            className="w-6 h-6 flex items-center justify-center text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-[#152644] font-bold"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToOnlineCart(prod)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition active:scale-98"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CHECKOUT MODAL */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handlePlaceOnlineOrder}
            className="bg-white dark:bg-[#111C30] rounded-3xl max-w-md w-full p-5 sm:p-6 border border-slate-200 dark:border-[#1F2E4D] shadow-2xl animate-in fade-in zoom-in-95 space-y-4 text-slate-800 dark:text-[#F8FAFC]"
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-[#1F2E4D]">
              <h3 className="font-bold text-base text-slate-900 dark:text-[#F8FAFC]">Complete Online Order</h3>
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1E2E4A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={e => setCustName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] font-bold focus:border-[#2563EB] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={custPhone}
                  onChange={e => setCustPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] font-medium focus:border-[#2563EB] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Delivery Address *</label>
                <input
                  type="text"
                  required
                  value={custAddress}
                  onChange={e => setCustAddress(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] font-medium focus:border-[#2563EB] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Special Order Notes</label>
                <input
                  type="text"
                  value={custNotes}
                  onChange={e => setCustNotes(e.target.value)}
                  placeholder="Optional delivery instructions..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] font-medium focus:border-[#2563EB] focus:outline-hidden"
                />
              </div>

              {/* Order Summary */}
              <div className="p-3.5 bg-slate-50 dark:bg-[#0B1220] rounded-2xl border border-slate-200 dark:border-[#1F2E4D] space-y-1">
                <div className="flex justify-between font-bold text-slate-800 dark:text-[#F8FAFC]">
                  <span>Order Total ({cartItemCount} items):</span>
                  <span className="text-[#2563EB] dark:text-[#06B6D4] font-extrabold">{VelcoraPricingEngine.formatCurrency(cartTotal, currency)}</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-[#94A3B8] font-medium">Payment on Delivery / Direct Store Pickup</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-[#1F2E4D]">
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1E2E4A] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-2xs transition active:scale-98"
              >
                Confirm Order
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
