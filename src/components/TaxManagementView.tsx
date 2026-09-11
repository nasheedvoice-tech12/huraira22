import React, { useState } from 'react';
import { useVelcora } from '../context/VelcoraContext';
import { TaxRateConfig } from '../types';
import {
  FileSpreadsheet, Plus, CheckCircle, Percent,
  Building2, Receipt, ShieldCheck
} from 'lucide-react';

export const TaxManagementView: React.FC = () => {
  const { taxRates, addTaxRate, updateTaxRate, deleteTaxRate, activeBusiness, updateActiveBusiness } = useVelcora();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formRatePercent, setFormRatePercent] = useState<number>(8.0);
  const [formTaxNumber, setFormTaxNumber] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);

  const currencySymbol = activeBusiness.currencySymbol || '$';

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) return;

    const newTax: TaxRateConfig = {
      id: `tax-${Date.now()}`,
      businessId: activeBusiness.id,
      name: formName,
      rate: Number(formRatePercent) / 100,
      isDefault: formIsDefault,
      isEnabled: true,
      taxNumber: formTaxNumber || undefined,
      description: formDescription,
    };

    if (formIsDefault) {
      taxRates.forEach(t => {
        if (t.isDefault) updateTaxRate(t.id, { isDefault: false });
      });
      updateActiveBusiness({ taxRateDefault: newTax.rate });
    }

    addTaxRate(newTax);
    setIsCreateModalOpen(false);
    setFormName('');
    setFormRatePercent(8.0);
    setFormTaxNumber('');
    setFormDescription('');
    setFormIsDefault(false);
  };

  const handleSetDefault = (tax: TaxRateConfig) => {
    taxRates.forEach(t => {
      updateTaxRate(t.id, { isDefault: t.id === tax.id });
    });
    updateActiveBusiness({ taxRateDefault: tax.rate });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="velcora-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-primary-light text-primary flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Taxes & Fiscal Compliance</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary-light text-primary">
              {(activeBusiness.taxRateDefault * 100).toFixed(1)}% Default Rate
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configure sales tax, VAT, GST, luxury surtaxes, and tax-inclusive pricing across product categories.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="velcora-btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Tax Rate</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="velcora-card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-2">
            <span>DEFAULT TAX RATE</span>
            <Percent className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-primary">
            {(activeBusiness.taxRateDefault * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-slate-500 mt-1">Applied to standard checkout</div>
        </div>

        <div className="velcora-card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-2">
            <span>PRICING MODEL</span>
            <Building2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white capitalize">
            {activeBusiness.taxInclusive ? 'Tax Inclusive' : 'Tax Added at POS'}
          </div>
          <div className="text-xs text-emerald-600/80 mt-1">
            {activeBusiness.taxInclusive ? 'Gross retail pricing' : 'Net subtotal + tax'}
          </div>
        </div>

        <div className="velcora-card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-2">
            <span>EST. TAX COLLECTED</span>
            <FileSpreadsheet className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {currencySymbol}624.80
          </div>
          <div className="text-xs text-slate-500 mt-1">Active billing period</div>
        </div>

        <div className="velcora-card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-2">
            <span>TAX IDENTIFIER</span>
            <ShieldCheck className="w-4 h-4 text-primary" />
          </div>
          <div className="text-base font-mono font-bold text-slate-900 dark:text-white truncate">
            {activeBusiness.taxNumber || 'US-TAX-892182'}
          </div>
          <div className="text-xs text-primary/80 mt-1">Printed on receipts</div>
        </div>
      </div>

      {/* Main Grid: Tax Rates Table & Global Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Tax Rates List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="velcora-card overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">Configured Tax Rates</h2>
              <span className="text-xs text-slate-500">{taxRates.length} rules defined</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {taxRates.map((tax) => (
                <div
                  key={tax.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {tax.name}
                      </span>
                      {tax.isDefault && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-light text-primary border border-primary/20">
                          DEFAULT
                        </span>
                      )}
                      {!tax.isEnabled && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          DISABLED
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {tax.description || 'Standard applicable fiscal rate.'}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-slate-500 pt-0.5">
                      <span className="font-mono">
                        Tax ID: <span className="text-slate-700 dark:text-slate-300 font-semibold">{tax.taxNumber || 'Default Business ID'}</span>
                      </span>
                      {tax.applicableCategories && (
                        <span>• Categories: {tax.applicableCategories.join(', ')}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <div className="text-right">
                      <div className="text-xl font-bold text-primary font-mono">
                        {(tax.rate * 100).toFixed(1)}%
                      </div>
                      <div className="text-[11px] text-slate-400">Rate</div>
                    </div>

                    <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-slate-800">
                      {!tax.isDefault && (
                        <button
                          onClick={() => handleSetDefault(tax)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-primary-light hover:text-primary"
                        >
                          Set Default
                        </button>
                      )}

                      <button
                        onClick={() => updateTaxRate(tax.id, { isEnabled: !tax.isEnabled })}
                        className={`p-1.5 rounded-lg text-xs font-semibold ${
                          tax.isEnabled
                            ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            : 'text-slate-400 hover:bg-slate-100'
                        }`}
                        title={tax.isEnabled ? 'Disable Tax' : 'Enable Tax'}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>

                      {!tax.isDefault && (
                        <button
                          onClick={() => deleteTaxRate(tax.id)}
                          className="p-1.5 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                          title="Delete Tax Rule"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Global Tax Settings */}
        <div className="space-y-4">
          <div className="velcora-card p-5 space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Fiscal Display Settings</span>
            </h3>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Tax Inclusive Pricing
                  </span>
                  <input
                    type="checkbox"
                    checked={activeBusiness.taxInclusive}
                    onChange={(e) => updateActiveBusiness({ taxInclusive: e.target.checked })}
                    className="w-4 h-4 accent-purple-600 rounded"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  When enabled, sticker prices on products already include VAT/tax. Tax is broken down on the receipt.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Business Tax ID / GSTIN
                </label>
                <input
                  type="text"
                  value={activeBusiness.taxNumber || ''}
                  onChange={(e) => updateActiveBusiness({ taxNumber: e.target.value })}
                  placeholder="e.g. US-TAX-892182"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Receipt Tax Disclaimer
                </label>
                <textarea
                  rows={2}
                  value={activeBusiness.receiptFooter || ''}
                  onChange={(e) => updateActiveBusiness({ receiptFooter: e.target.value })}
                  placeholder="Fiscal terms printed at receipt bottom..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Tax Rate Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="velcora-card w-full max-w-md p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-slate-900 dark:text-white text-base">Add Tax Rate</h2>
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
                  Tax Rule Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. County Sales Tax, VAT Standard"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Rate Percentage (%) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={Number.isNaN(formRatePercent) ? "" : formRatePercent}
                    onChange={(e) => setFormRatePercent(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Tax Number / Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TX-NY-991"
                    value={formTaxNumber}
                    onChange={(e) => setFormTaxNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Standard 8% state and county retail rate"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="defaultTaxCheck"
                  checked={formIsDefault}
                  onChange={(e) => setFormIsDefault(e.target.checked)}
                  className="w-4 h-4 accent-purple-600 rounded"
                />
                <label htmlFor="defaultTaxCheck" className="text-xs text-slate-700 dark:text-slate-300">
                  Set as default tax rate for new transactions
                </label>
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
                  Save Tax Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
