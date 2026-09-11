import React, { useState, useMemo } from 'react';
import { useVelcora } from '../context/VelcoraContext';
import { PromotionCampaign } from '../types';
import {
  Tag, Plus, CheckCircle, Percent,
  Sparkles, Search, Copy, Check, Eye
} from 'lucide-react';

export const PromotionsDiscounts: React.FC = () => {
  const { promotions, addPromotion, updatePromotion, deletePromotion, activeBusiness, setCurrentModule, salesHistory } = useVelcora();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'percentage' | 'fixed_amount'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Simulator State
  const [simCartTotal, setSimCartTotal] = useState<number>(100);
  const [simCouponCode, setSimCouponCode] = useState<string>('');

  // Dynamically calculate actual discounts given to customers from sales
  const actualDiscountValue = useMemo(() => {
    return (salesHistory || []).reduce((acc, sale) => {
      const discount = Number(sale.discountTotal) || Number((sale as any).discount) || Number((sale as any).discountAmount) || 0;
      return acc + (isNaN(discount) ? 0 : discount);
    }, 0);
  }, [salesHistory]);

  // New Promotion Form
  const [formTitle, setFormTitle] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<'percentage' | 'fixed_amount' | 'buy_x_get_y'>('percentage');
  const [formDiscountValue, setFormDiscountValue] = useState<number>(15);
  const [formMinOrder, setFormMinOrder] = useState<number>(50);
  const [formLimit, setFormLimit] = useState<number>(100);
  const [formNotes, setFormNotes] = useState('');

  const currencySymbol = activeBusiness.currencySymbol || '$';

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formCode) return;

    const newPromo: PromotionCampaign = {
      id: `promo-${Date.now()}`,
      businessId: activeBusiness.id,
      title: formTitle,
      code: formCode.toUpperCase().trim(),
      type: formType,
      discountValue: Number(formDiscountValue),
      minOrderValue: Number(formMinOrder) || 0,
      usageLimit: Number(formLimit) || undefined,
      usageCount: 0,
      isActive: true,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      notes: formNotes,
    };

    addPromotion(newPromo);
    setIsCreateModalOpen(false);
    // Reset form
    setFormTitle('');
    setFormCode('');
    setFormDiscountValue(15);
    setFormNotes('');
  };

  const filteredPromos = promotions.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.code.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filterType === 'active') return p.isActive;
    if (filterType === 'percentage') return p.type === 'percentage';
    if (filterType === 'fixed_amount') return p.type === 'fixed_amount';
    return true;
  });

  // Calculate simulation
  const matchedSimPromo = promotions.find(p => p.code.toUpperCase() === simCouponCode.toUpperCase() && p.isActive);
  let calculatedDiscount = 0;
  let simEligible = false;
  let simMessage = '';

  if (!matchedSimPromo) {
    simMessage = 'Coupon code not found or inactive';
  } else if (matchedSimPromo.minOrderValue && simCartTotal < matchedSimPromo.minOrderValue) {
    simMessage = `Requires minimum order of ${currencySymbol}${(matchedSimPromo.minOrderValue ?? 0).toFixed(2)}`;
  } else {
    simEligible = true;
    if (matchedSimPromo.type === 'percentage') {
      calculatedDiscount = (simCartTotal * (matchedSimPromo.discountValue ?? 0)) / 100;
    } else if (matchedSimPromo.type === 'fixed_amount') {
      calculatedDiscount = Math.min(simCartTotal, (matchedSimPromo.discountValue ?? 0));
    } else {
      calculatedDiscount = (matchedSimPromo.discountValue ?? 0);
    }
    simMessage = `Saved ${currencySymbol}${(calculatedDiscount ?? 0).toFixed(2)} with ${matchedSimPromo.code}!`;
  }

  const finalSimTotal = Math.max(0, simCartTotal - calculatedDiscount);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header Banner */}
      <div className="velcora-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-primary-light text-primary flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Promotions & Discounts</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary-light text-primary">
              {promotions.filter(p => p.isActive).length} Active
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create coupon codes, percentage markdowns, and instant cash discounts applied directly at checkout.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="velcora-btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="velcora-card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-2">
            <span>TOTAL CAMPAIGNS</span>
            <Tag className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{promotions.length}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Across all categories</div>
        </div>

        <div className="velcora-card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-2">
            <span>ACTIVE DEALS</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {promotions.filter(p => p.isActive).length}
          </div>
          <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">Ready for checkout</div>
        </div>

        <div className="velcora-card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-2">
            <span>TOTAL REDEMPTIONS</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {promotions.reduce((acc, p) => acc + (p.usageCount || 0), 0)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Customer uses to date</div>
        </div>

        <div className="velcora-card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-2">
            <span>EST. DISCOUNT VALUE</span>
            <Percent className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-primary">
            {currencySymbol}{actualDiscountValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-primary/80 mt-1">Incentivized sales volume</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Campaigns List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter Bar */}
          <div className="velcora-card p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search promotion or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-ring"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {(['all', 'active', 'percentage', 'fixed_amount'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilterType(tab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                    filterType === tab
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab === 'all' && 'All Deals'}
                  {tab === 'active' && 'Active Only'}
                  {tab === 'percentage' && '% Off'}
                  {tab === 'fixed_amount' && `${currencySymbol} Off`}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="space-y-3">
            {filteredPromos.map((promo) => (
              <div
                key={promo.id}
                className={`velcora-card p-5 transition-all duration-200 ${
                  promo.isActive ? 'hover:border-primary/40' : 'opacity-60 bg-slate-50 dark:bg-slate-900/40'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-slate-900 dark:text-white text-base">
                        {promo.title}
                      </span>
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-primary-light border border-primary/20 text-primary font-mono font-bold text-xs tracking-wider">
                        <span>{promo.code}</span>
                        <button
                          onClick={() => handleCopy(promo.code)}
                          className="hover:text-slate-900 dark:hover:text-white p-0.5"
                          title="Copy Code"
                        >
                          {copiedCode === promo.code ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {promo.notes || 'Universal discount applicable during active promotion dates.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Discount:</span>
                        <span className="text-primary font-bold">
                          {promo.type === 'percentage' && `${promo.discountValue}% OFF`}
                          {promo.type === 'fixed_amount' && `${currencySymbol}${(promo.discountValue ?? 0).toFixed(2)} OFF`}
                          {promo.type === 'buy_x_get_y' && `Buy ${promo.buyQty || 2} Get ${promo.getQty || 1}`}
                        </span>
                      </span>

                      {promo.minOrderValue ? (
                        <span className="flex items-center gap-1">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Min Spend:</span>
                          <span>{currencySymbol}{(promo.minOrderValue ?? 0).toFixed(2)}</span>
                        </span>
                      ) : null}

                      <span className="flex items-center gap-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Redeemed:</span>
                        <span>{promo.usageCount || 0} {promo.usageLimit ? `/ ${promo.usageLimit}` : 'times'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions & Status Toggle */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => updatePromotion(promo.id, { isActive: !promo.isActive })}
                      className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 transition-colors ${
                        promo.isActive
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${promo.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {promo.isActive ? 'Active' : 'Paused'}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSimCouponCode(promo.code);
                        }}
                        className="p-1.5 text-xs text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                        title="Simulate in Calculator"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deletePromotion(promo.id)}
                        className="p-1.5 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                        title="Delete promotion"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredPromos.length === 0 && (
              <div className="velcora-card p-12 text-center text-slate-400">
                <Tag className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">No campaigns found</p>
                <p className="text-xs text-slate-500">Create a discount deal to incentivize more customer sales.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Instant Calculator & Live POS Applicator */}
        <div className="space-y-4">
          {/* Coupon Tester Card */}
          <div className="velcora-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Instant Discount Tester</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Test how coupon logic calculates on realistic customer cart totals before launching.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Simulated Subtotal ({currencySymbol})
                </label>
                <input
                  type="number"
                  value={Number.isNaN(simCartTotal) ? "" : simCartTotal}
                  onChange={(e) => setSimCartTotal(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Coupon Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={simCouponCode}
                    onChange={(e) => setSimCouponCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SPRING20"
                    className="w-full px-3 py-2 text-sm font-mono uppercase rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-ring"
                  />
                </div>
              </div>

              {/* Result Preview Box */}
              <div className={`p-3.5 rounded-xl border ${
                simEligible
                  ? 'bg-primary-light border-primary/20'
                  : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
              }`}>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="text-slate-500 dark:text-slate-400">Calculated Discount:</span>
                  <span className={`font-bold ${simEligible ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    -{currencySymbol}{(calculatedDiscount ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700/60 pt-1.5">
                  <span>Customer Pays:</span>
                  <span className="text-primary text-base">
                    {currencySymbol}{(finalSimTotal ?? 0).toFixed(2)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                  {simMessage}
                </p>
              </div>

              <button
                onClick={() => setCurrentModule('pos')}
                className="w-full py-2.5 text-xs font-semibold rounded-xl bg-primary hover:bg-primary-hover text-white transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Launch POS Register</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Promotion Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="velcora-card w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                  <Tag className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-slate-900 dark:text-white text-base">Create Promotional Campaign</h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Campaign Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Summer Weekend Flash Sale"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SUMMER25"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-sm font-mono uppercase rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Discount Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-ring"
                  >
                    <option value="percentage">Percentage (%) Off</option>
                    <option value="fixed_amount">Fixed Cash ({currencySymbol}) Off</option>
                    <option value="buy_x_get_y">Buy X Get Y Deal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {formType === 'percentage' ? 'Percentage Discount (%)' : `Discount Amount (${currencySymbol})`}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={formType === 'percentage' ? 100 : 10000}
                    value={Number.isNaN(formDiscountValue) ? "" : formDiscountValue}
                    onChange={(e) => setFormDiscountValue(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Min Order Spend ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={Number.isNaN(formMinOrder) ? "" : formMinOrder}
                    onChange={(e) => setFormMinOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-ring"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Customer Notes / Rules
                </label>
                <textarea
                  rows={2}
                  placeholder="Terms and restrictions applied at POS..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-ring"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="velcora-btn-primary"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
