import React, { useState } from 'react';
import { useVelcora } from '../context/VelcoraContext';
import {
  Users, Award, Plus, Search, Edit2, Trash2, AlertTriangle, Sliders,
  DollarSign, Check, X, ShieldCheck, Sparkles, Phone, Mail
} from 'lucide-react';
import { Customer, LoyaltyRuleConfig } from '../types';
import { VelcoraPricingEngine } from '../utils/pricingEngine';
import { VelcoraLoyaltyEngine } from '../utils/loyaltyEngine';
import { useTranslation } from '../context/TranslationContext';

export const CustomerAndLoyalty: React.FC = () => {
  const {
    customers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    loyaltyConfig,
    updateLoyaltyConfig,
    currency,
    activeBusiness,
    activeUser} = useVelcora();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'customers' | 'loyalty_rules'>('customers');
  const [search, setSearch] = useState('');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // New Customer Form
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cTier, setCTier] = useState('Standard');

  const isAuthorized = activeUser?.roleId === 'role-owner' || activeUser?.roleId === 'role-manager' || activeUser?.roleId === 'role-admin';

  // Loyalty Config Live State
  const [configForm, setConfigForm] = useState<LoyaltyRuleConfig>({ ...loyaltyConfig });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Simulation State
  const [simSpend, setSimSpend] = useState<number>(100);
  const [simTier, setSimTier] = useState<string>('Standard');

  const filteredCustomers = customers.filter(c => {
    const q = search.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone ? c.phone.includes(q) : false) ||
      (c.email ? c.email.toLowerCase().includes(q) : false)
    );
  });

  const handleOpenAddCustomer = () => {
    setEditingCustomerId(null);
    setCName('');
    setCPhone('');
    setCEmail('');
    setCTier('Standard');
    setShowAddCustomerModal(true);
  };

  const handleOpenEditCustomer = (c: Customer) => {
    setEditingCustomerId(c.id);
    setCName(c.name);
    setCPhone(c.phone || '');
    setCEmail(c.email || '');
    setCTier(c.tier);
    setShowAddCustomerModal(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim()) return;

    if (editingCustomerId) {
      updateCustomer(editingCustomerId, {
        name: cName.trim(),
        phone: cPhone.trim() || '+1 (555) 000-0000',
        email: cEmail.trim() || undefined,
        tier: cTier,
      });
    } else {
      const newCust: Customer = {
        id: `cust-${Date.now()}`,
        businessId: activeBusiness.id,
        name: cName.trim(),
        phone: cPhone.trim() || '+1 (555) 000-0000',
        email: cEmail.trim() || undefined,
        loyaltyPoints: configForm.bonusPointsForNewCustomer || 25,
        tier: cTier,
        totalSpent: 0,
        ordersCount: 0,
        outstandingBalance: 0,
        customFields: {},
      };
      addCustomer(newCust);
    }
    setShowAddCustomerModal(false);
    setCName('');
    setCPhone('');
    setCEmail('');
    setCTier('Standard');
    setEditingCustomerId(null);
  };

  const handleSaveLoyaltyRules = (e: React.FormEvent) => {
    e.preventDefault();
    updateLoyaltyConfig(configForm);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Sim preview
  const simPointsEarned = VelcoraLoyaltyEngine.calculatePointsEarned(simSpend, [], configForm, simTier);
  const simRedemptionValue = VelcoraLoyaltyEngine.calculateRedemptionDiscount(simPointsEarned, configForm);

  return (
    <div id="velcora-customers-loyalty" className="space-y-4">
      {permissionError && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 p-4 rounded-2xl flex items-start gap-3 text-rose-800 dark:text-rose-300 text-xs font-semibold shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span>{permissionError}</span>
          </div>
          <button onClick={() => setPermissionError(null)} className="text-rose-500 hover:text-rose-700 font-bold text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#111C30] p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary p-0.5 shadow-2xs">
            <div className="w-full h-full rounded-[14px] bg-white dark:bg-[#111C30] flex items-center justify-center text-primary">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-[#F8FAFC]">Customers CRM & Loyalty Engine</h2>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">{customers.length} enrolled customer accounts</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] p-1.5 rounded-2xl">
            <button
              onClick={() => setActiveTab('customers')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'customers'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-slate-600 dark:text-[#94A3B8] hover:text-primary dark:hover:text-[#F8FAFC]'
              }`}
            >
              Customer Directory
            </button>
            <button
              onClick={() => setActiveTab('loyalty_rules')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'loyalty_rules'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-slate-600 dark:text-[#94A3B8] hover:text-primary dark:hover:text-[#F8FAFC]'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-primary" />
              <span>Loyalty Rules Engine</span>
            </button>
          </div>

          {activeTab === 'customers' && (
            <button
              onClick={handleOpenAddCustomer}
              className="px-4 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-2xs transition active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Add Customer</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'customers' ? (
        /* CUSTOMERS TABLE */
        <div className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search customer name, phone, email..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-xs text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#94A3B8]/50 focus:border-primary focus:outline-hidden shadow-2xs"
            />
          </div>

          <div className="bg-white dark:bg-[#111C30] rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 dark:bg-[#0B1220] border-b border-slate-200 dark:border-[#1F2E4D] text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider font-extrabold text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">{t('customer')}</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Loyalty Tier</th>
                  <th className="py-3.5 px-4">Reward Points</th>
                  <th className="py-3.5 px-4">Lifetime Spent</th>
                  <th className="py-3.5 px-4">Total Orders</th>
                  <th className="py-3.5 px-4 text-right">Balance Due</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1F2E4D] font-medium text-slate-700 dark:text-[#94A3B8]">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-[#94A3B8]">
                      <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-[#94A3B8] stroke-1" />
                      <p className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8]">No customer records found</p>
                      <button
                        onClick={handleOpenAddCustomer}
                        className="mt-3 px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition"
                      >
                        + Add First Customer
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-[#152644]/50 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-[#F8FAFC] text-xs sm:text-sm">{c.name}</div>
                      <div className="text-[10px] text-slate-400 dark:text-[#94A3B8]/70">ID: {c.id}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-[#94A3B8]">
                      <div>{c.phone}</div>
                      {c.email && <div className="text-[10px] text-slate-400 dark:text-[#94A3B8]/80">{c.email}</div>}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-bold px-2.5 py-1 rounded-full text-[11px] ${
                          c.tier === 'Platinum'
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : c.tier === 'Gold'
                            ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                            : 'bg-slate-50 dark:bg-[#0B1220] text-slate-700 dark:text-[#94A3B8]'
                        }`}
                      >
                        {c.tier}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-primary">
                      ⭐ {c.loyaltyPoints.toLocaleString()} pts
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-900 dark:text-[#F8FAFC]">
                      {VelcoraPricingEngine.formatCurrency(c.totalSpent, currency)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-[#94A3B8] font-semibold">{c.ordersCount} orders</td>
                    <td className="py-3.5 px-4 text-right">
                      {c.outstandingBalance > 0 ? (
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          {VelcoraPricingEngine.formatCurrency(c.outstandingBalance, currency)}
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {VelcoraPricingEngine.formatCurrency(0, currency)}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 font-sans">
                        <button
                          onClick={() => handleOpenEditCustomer(c)}
                          className="p-1.5 rounded-xl text-slate-400 dark:text-[#94A3B8] hover:text-primary dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1E2E4A] transition"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {deleteConfirmId === c.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/20 p-1 rounded-xl border border-rose-200 dark:border-rose-900/40">
                            <button
                              onClick={() => {
                                if (!isAuthorized) {
                                  setPermissionError("You do not have permission to delete customer records. Only Owners or Managers can delete records.");
                                  setTimeout(() => setPermissionError(null), 5000);
                                  setDeleteConfirmId(null);
                                  return;
                                }
                                deleteCustomer(c.id);
                                setDeleteConfirmId(null);
                              }}
                              className="px-2 py-1 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-1.5 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(c.id)}
                            className="p-1.5 rounded-xl text-slate-400 dark:text-[#94A3B8] hover:text-rose-600 dark:hover:text-[#FB7185] hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                            title="Delete Customer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      ) : (
        /* 100% CUSTOMIZABLE LOYALTY RULES ENGINE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveLoyaltyRules}
            className="lg:col-span-8 bg-white dark:bg-[#111C30] rounded-3xl p-6 border border-slate-200 dark:border-[#1F2E4D] shadow-2xs space-y-5 text-slate-800 dark:text-[#F8FAFC]"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-[#1F2E4D]">
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-[#F8FAFC]">Configurable Loyalty Rules</h3>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">
                  Define point generation ratios, redemption values, and VIP tier multipliers
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enable-loyalty-chk"
                  checked={configForm.enabled}
                  onChange={e => setConfigForm({ ...configForm, enabled: e.target.checked })}
                  className="rounded-lg text-primary focus:ring-primary bg-slate-50 dark:bg-[#0B1220] border-slate-200 dark:border-[#1F2E4D]"
                />
                <label htmlFor="enable-loyalty-chk" className="text-xs font-bold text-slate-800 dark:text-[#F8FAFC]">
                  Enable Loyalty Program
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">
                  Point Generation Ratio (Points per {currency || '$'}1 Spent)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={configForm.pointsPerSpendUnit}
                  onChange={e => setConfigForm({ ...configForm, pointsPerSpendUnit: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-bold text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">
                  Redemption Cash Value ({currency || '$'} discount per 1 Point)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={configForm.pointRedemptionValue}
                  onChange={e => setConfigForm({ ...configForm, pointRedemptionValue: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-bold text-primary focus:border-primary focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400 dark:text-[#94A3B8]/80 mt-0.5 block">
                  Example: 0.05 means 100 points = {currency || '$'}5.00 discount
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">
                  Minimum Points Threshold to Redeem
                </label>
                <input
                  type="number"
                  value={configForm.minPointsForRedemption}
                  onChange={e => setConfigForm({ ...configForm, minPointsForRedemption: parseInt(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] font-bold focus:border-primary focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">
                  Welcome Bonus Points (New Customer Sign-up)
                </label>
                <input
                  type="number"
                  value={configForm.bonusPointsForNewCustomer || 0}
                  onChange={e => setConfigForm({ ...configForm, bonusPointsForNewCustomer: parseInt(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] font-bold focus:border-primary focus:outline-hidden"
                />
              </div>
            </div>

            {/* VIP Tiers Matrix */}
            <div className="pt-2">
              <h4 className="font-bold text-xs text-slate-800 dark:text-[#F8FAFC] mb-2">VIP Customer Tiers & Multipliers</h4>
              <div className="space-y-2">
                {configForm.tiers.map((tier) => (
                  <div key={tier.name} className="p-3.5 bg-slate-50 dark:bg-[#0B1220] rounded-2xl border border-slate-200 dark:border-[#1F2E4D] flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-[#F8FAFC]">{tier.name}</span>
                    <span className="text-slate-500 dark:text-[#94A3B8] font-medium">Qualify: ${tier.minSpendRequirement.toLocaleString()}+</span>
                    <span className="font-extrabold text-primary">{tier.pointsMultiplier}x Multiplier</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-[#1F2E4D]">
              {saveSuccess && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-4 h-4" /> Loyalty rules updated successfully!
                </span>
              )}
              <button
                type="submit"
                className="ml-auto px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-2xs transition active:scale-98"
              >
                Save Loyalty Configuration
              </button>
            </div>
          </form>

          {/* SIMULATION CALCULATOR */}
          <div className="lg:col-span-4 bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] rounded-3xl p-6 shadow-2xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-[#F8FAFC]">Real-Time Rule Simulator</h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">
                Test how your custom rules calculate points & redemption in live transactions
              </p>

              <div className="space-y-3 pt-2 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-[#94A3B8] font-bold mb-1">Simulate Cart Amount ({currency || '$'})</label>
                  <input
                    type="number"
                    value={simSpend}
                    onChange={e => setSimSpend(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] font-bold focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-[#94A3B8] font-bold mb-1">Customer Tier</label>
                  <select
                    value={simTier}
                    onChange={e => setSimTier(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-800 dark:text-[#F8FAFC] font-bold focus:border-primary focus:outline-hidden"
                  >
                    {configForm.tiers.map(t => (
                      <option key={t.name} value={t.name} className="bg-white dark:bg-[#111C30] text-slate-900 dark:text-[#F8FAFC]">
                        {t.name} ({t.pointsMultiplier}x)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-[#0B1220] rounded-2xl border border-slate-200 dark:border-[#1F2E4D] space-y-2 text-xs mt-4">
              <div className="flex justify-between text-slate-600 dark:text-[#94A3B8] font-medium">
                <span>Points Earned:</span>
                <span className="font-extrabold text-primary text-sm">+{simPointsEarned} pts</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-[#94A3B8] font-medium">
                <span>Equivalent Cash Discount:</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">{currency || '$'}{(simRedemptionValue ?? 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW CUSTOMER MODAL */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveCustomer}
            className="bg-white dark:bg-[#111C30] rounded-3xl max-w-sm w-full p-5 sm:p-6 border border-slate-200 dark:border-[#1F2E4D] shadow-2xl animate-in fade-in zoom-in-95 space-y-4 text-slate-800 dark:text-[#F8FAFC]"
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-[#1F2E4D]">
              <h3 className="font-bold text-base text-slate-900 dark:text-[#F8FAFC]">
                {editingCustomerId ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1E2E4A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={cName}
                  onChange={e => setCName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] font-bold focus:border-primary focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Phone Number</label>
                <input
                  type="text"
                  value={cPhone}
                  onChange={e => setCPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] font-medium focus:border-primary focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Email</label>
                <input
                  type="email"
                  value={cEmail}
                  onChange={e => setCEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] font-medium focus:border-primary focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Loyalty Tier</label>
                <select
                  value={cTier}
                  onChange={e => setCTier(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-800 dark:text-[#F8FAFC] font-bold focus:border-primary focus:outline-hidden"
                >
                  <option value="Standard">Standard</option>
                  <option value="Silver">Silver</option>
                  <option value="Gold">Gold</option>
                  <option value="Platinum">Platinum</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-[#1F2E4D]">
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1E2E4A] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary-hover text-white shadow-2xs transition active:scale-98"
              >
                {editingCustomerId ? 'Save Changes' : 'Create Customer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
