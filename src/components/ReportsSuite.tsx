import React, { useState } from 'react';
import { useVelcora } from '../context/VelcoraContext';
import {
  BarChart3, FileSpreadsheet, Download, Printer, Filter,
  DollarSign, TrendingUp, Calendar, Table, Sparkles
} from 'lucide-react';
import { VelcoraPricingEngine } from '../utils/pricingEngine';

export const ReportsSuite: React.FC = () => {
  const {
    salesHistory,
    products,
    expenses,
    customers,
    brainMetrics,
    currency,
    activeBusiness} = useVelcora();

  const [activeReport, setActiveReport] = useState<'pnl' | 'sales_by_item' | 'inventory_val' | 'custom'>('pnl');

  const reportTabs = React.useMemo(() => {
    const tabs = [
      { id: 'pnl', label: 'Profit & Loss Statement (P&L)' },
      { id: 'sales_by_item', label: activeBusiness.businessModel === 'service' ? 'Service Sales & Margins' : 'Item Sales & Margins' },
      { id: 'inventory_val', label: 'Inventory Valuation' },
      { id: 'custom', label: 'Custom Report Builder' },
    ];
    if (activeBusiness.businessModel === 'service') {
      return tabs.filter(t => t.id !== 'inventory_val');
    }
    return tabs;
  }, [activeBusiness.businessModel]);

  // Custom Report Builder States
  const [customDimension, setCustomDimension] = useState<'category' | 'customer' | 'payment_method'>('category');
  const [customMetric, setCustomMetric] = useState<'revenue' | 'quantity' | 'profit'>('revenue');

  const pivotData = React.useMemo(() => {
    const validSales = (salesHistory || []).filter(s => s.status !== 'cancelled');
    const totals: Record<string, number> = {};

    validSales.forEach(sale => {
      sale.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const cat = prod?.category || (prod?.isService ? 'Services' : 'General');
        
        let key = '';
        if (customDimension === 'category') {
          key = cat;
        } else if (customDimension === 'customer') {
          key = sale.customerName || 'Walk-in Customer';
        } else if (customDimension === 'payment_method') {
          key = sale.payments?.[0]?.method || 'Cash';
          key = key.charAt(0).toUpperCase() + key.slice(1);
        }

        let amount = 0;
        if (customMetric === 'revenue') {
          amount = item.unitPrice * item.quantity;
        } else if (customMetric === 'quantity') {
          amount = item.quantity;
        } else if (customMetric === 'profit') {
          const cost = prod?.costPrice || item.costPrice || (item.unitPrice * 0.55);
          amount = (item.unitPrice - cost) * item.quantity;
        }

        totals[key] = (totals[key] || 0) + amount;
      });
    });

    return Object.entries(totals).map(([dimensionValue, aggValue]) => ({
      dimensionValue,
      aggValue,
    })).sort((a, b) => b.aggValue - a.aggValue);
  }, [salesHistory, products, customDimension, customMetric]);

  const handleExportCsv = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    if (activeReport === 'sales_by_item') {
      csvContent += 'Product,SKU,Category,Sold Qty,Unit Price,Revenue\n';
      products.forEach(p => {
        const sellingPrice = p.sellingPrice ?? 0;
        const stock = p.stock ?? 0;
        csvContent += `"${p.name}","${p.sku}","${p.category}",${stock},${sellingPrice},${(stock * sellingPrice).toFixed(2)}\n`;
      });
    } else {
      csvContent += 'Metric,Value\n';
      csvContent += `Gross Revenue,${brainMetrics.totalRevenue}\n`;
      csvContent += `COGS,${brainMetrics.cogs}\n`;
      csvContent += `Gross Profit,${brainMetrics.grossProfit}\n`;
      csvContent += `Operating Expenses,${brainMetrics.totalExpenses}\n`;
      csvContent += `Net Profit,${brainMetrics.netProfit}\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Velcora_${activeReport}_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="velcora-reports-suite" className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#111C30] p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#2563EB] p-0.5 shadow-2xs">
            <div className="w-full h-full rounded-[14px] bg-white dark:bg-[#111C30] flex items-center justify-center text-[#2563EB] dark:text-[#06B6D4]">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-[#F8FAFC]">Financial & Operational Reports Suite</h2>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">Official P&L statements, COGS margins, and custom data builder</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-2xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] hover:bg-slate-100 dark:hover:bg-[#1E2E4A] text-slate-700 dark:text-[#F8FAFC] font-bold text-xs flex items-center gap-1.5 transition"
          >
            <Download className="w-4 h-4 text-[#2563EB] dark:text-[#06B6D4]" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-2xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition active:scale-98"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Report Nav Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {reportTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id as any)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
              activeReport === tab.id
                ? 'bg-[#2563EB] text-white shadow-2xs'
                : 'bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-600 dark:text-[#94A3B8] hover:text-[#2563EB] dark:hover:text-[#F8FAFC] shadow-2xs'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeReport === 'pnl' && (
        /* PROFIT & LOSS STATEMENT */
        <div className="bg-white dark:bg-[#111C30] rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-[#1F2E4D] shadow-2xs space-y-6 max-w-3xl mx-auto text-slate-800 dark:text-[#F8FAFC]">
          <div className="text-center pb-4 border-b border-slate-200 dark:border-[#1F2E4D]">
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-[#F8FAFC]">{activeBusiness.name}</h3>
            <p className="text-xs font-bold text-[#2563EB] dark:text-[#06B6D4] uppercase tracking-wider mt-1">
              Statement of Profit and Loss
            </p>
            <p className="text-[11px] text-slate-400 dark:text-[#94A3B8]/80 font-medium">Current Accounting Period</p>
          </div>

          <div className="space-y-5 text-xs">
            {/* Revenue Section */}
            <div className="space-y-2">
              <div className="font-extrabold text-slate-900 dark:text-[#F8FAFC] uppercase tracking-wider text-[11px] pb-1.5 border-b border-slate-200 dark:border-[#1F2E4D]">
                1. Operating Revenue
              </div>
              <div className="flex justify-between text-slate-600 dark:text-[#94A3B8]">
                <span>Gross Point-of-Sale Invoiced Receipts</span>
                <span className="font-bold text-slate-900 dark:text-[#F8FAFC]">{VelcoraPricingEngine.formatCurrency(brainMetrics.totalRevenue, currency)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 dark:text-[#F8FAFC] pt-1.5 border-t border-slate-200 dark:border-[#1F2E4D]">
                <span>Total Net Revenue</span>
                <span>{VelcoraPricingEngine.formatCurrency(brainMetrics.totalRevenue, currency)}</span>
              </div>
            </div>

            {/* Cost of Goods Sold */}
            <div className="space-y-2 pt-2">
              <div className="font-extrabold text-slate-900 dark:text-[#F8FAFC] uppercase tracking-wider text-[11px] pb-1.5 border-b border-slate-200 dark:border-[#1F2E4D]">
                2. Direct Cost of Goods Sold (COGS)
              </div>
              <div className="flex justify-between text-slate-600 dark:text-[#94A3B8]">
                <span>Product Acquisition / Inventory Cost</span>
                <span className="font-mono text-rose-600 dark:text-rose-400">({VelcoraPricingEngine.formatCurrency(brainMetrics.cogs, currency)})</span>
              </div>
              <div className="flex justify-between font-extrabold text-[#2563EB] dark:text-[#06B6D4] pt-1.5 border-t border-slate-200 dark:border-[#1F2E4D] text-sm">
                <span>GROSS PROFIT</span>
                <span>{VelcoraPricingEngine.formatCurrency(brainMetrics.grossProfit, currency)}</span>
              </div>
            </div>

            {/* Operating Expenses */}
            <div className="space-y-2 pt-2">
              <div className="font-extrabold text-slate-900 dark:text-[#F8FAFC] uppercase tracking-wider text-[11px] pb-1.5 border-b border-slate-200 dark:border-[#1F2E4D]">
                3. Operating Expenses
              </div>
              {expenses.map(exp => (
                <div key={exp.id} className="flex justify-between text-slate-500 dark:text-[#94A3B8]">
                  <span>{exp.category} ({exp.receiptNote || exp.title})</span>
                  <span className="font-mono text-rose-600 dark:text-rose-400">({VelcoraPricingEngine.formatCurrency(exp.amount, currency)})</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-rose-600 dark:text-rose-400 pt-1.5 border-t border-slate-200 dark:border-[#1F2E4D]">
                <span>Total Operating Overhead</span>
                <span>({VelcoraPricingEngine.formatCurrency(brainMetrics.totalExpenses, currency)})</span>
              </div>
            </div>

            {/* Final Net Profit */}
            <div className="pt-4 border-t-2 border-slate-200 dark:border-[#1F2E4D] flex justify-between items-center text-base font-extrabold bg-slate-50 dark:bg-[#0B1220] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-[#1F2E4D]">
              <div>
                <span className="text-slate-900 dark:text-[#F8FAFC]">NET OPERATING PROFIT</span>
                <span className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {brainMetrics.profitMargin}% Net Margin
                </span>
              </div>
              <span className="text-2xl text-emerald-600 dark:text-emerald-400">
                {VelcoraPricingEngine.formatCurrency(brainMetrics.netProfit, currency)}
              </span>
            </div>
          </div>
        </div>
      )}

      {activeReport === 'sales_by_item' && (
        /* SALES BY ITEM TABLE */
        <div className="bg-white dark:bg-[#111C30] rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 dark:bg-[#0B1220] border-b border-slate-200 dark:border-[#1F2E4D] text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider font-extrabold text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Item & SKU</th>
                  <th className="py-3.5 px-4">Unit Price</th>
                  <th className="py-3.5 px-4">Unit Cost</th>
                  <th className="py-3.5 px-4">Unit Margin</th>
                  <th className="py-3.5 px-4">Margin %</th>
                  <th className="py-3.5 px-4 text-right">Inventory Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1F2E4D] font-medium text-slate-700 dark:text-[#94A3B8]">
                {products.map(p => {
                  const sPrice = p.sellingPrice ?? 0;
                  const cPrice = p.costPrice ?? (sPrice * 0.4);
                  const stock = p.stock ?? 0;
                  const margin = sPrice - cPrice;
                  const marginPct = sPrice > 0 ? Math.round((margin / sPrice) * 100) : 0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-[#152644]/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-[#F8FAFC]">{p.name}</div>
                        <div className="font-mono text-[10px] text-slate-400 dark:text-[#94A3B8]/70">{p.sku}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-[#F8FAFC]">{VelcoraPricingEngine.formatCurrency(sPrice, currency)}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-[#94A3B8]">{VelcoraPricingEngine.formatCurrency(cPrice, currency)}</td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">+{VelcoraPricingEngine.formatCurrency(margin, currency)}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 text-[11px]">
                          {marginPct}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 dark:text-[#F8FAFC]">
                        {VelcoraPricingEngine.formatCurrency(stock * cPrice, currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeReport === 'inventory_val' && (
        <div className="bg-white dark:bg-[#111C30] rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-[#1F2E4D] shadow-2xs space-y-4">
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-[#F8FAFC]">Warehouse Inventory & Dead Stock Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-slate-50 dark:bg-[#0B1220] rounded-2xl border border-slate-200 dark:border-[#1F2E4D] space-y-1">
              <span className="text-xs text-slate-500 dark:text-[#94A3B8] font-bold">Total Stock Units</span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC]">
                {products.reduce((s, p) => s + p.stock, 0)} Units
              </div>
            </div>
            <div className="p-5 bg-slate-50 dark:bg-[#0B1220] rounded-2xl border border-slate-200 dark:border-[#1F2E4D] space-y-1">
              <span className="text-xs text-slate-500 dark:text-[#94A3B8] font-bold">Total Asset Value (Cost)</span>
              <div className="text-2xl font-extrabold text-[#2563EB] dark:text-[#06B6D4]">
                {VelcoraPricingEngine.formatCurrency(brainMetrics.totalInventoryValuation, currency)}
              </div>
            </div>
            <div className="p-5 bg-slate-50 dark:bg-[#0B1220] rounded-2xl border border-slate-200 dark:border-[#1F2E4D] space-y-1">
              <span className="text-xs text-slate-500 dark:text-[#94A3B8] font-bold">Dead Stock at Risk</span>
              <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
                {VelcoraPricingEngine.formatCurrency(brainMetrics.deadStockValuation, currency)}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeReport === 'custom' && (
        /* CUSTOM REPORT BUILDER */
        <div className="bg-white dark:bg-[#111C30] rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-[#1F2E4D] shadow-2xs space-y-5">
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-[#F8FAFC]">Interactive Custom Report Builder</h3>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">Pivot and aggregate your data across any dimension</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Group By Dimension</label>
              <select
                value={customDimension}
                onChange={e => setCustomDimension(e.target.value as any)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#1F2E4D] bg-slate-50 dark:bg-[#0B1220] text-slate-900 dark:text-[#F8FAFC] font-bold focus:border-[#2563EB] focus:outline-hidden"
              >
                <option value="category" className="bg-white dark:bg-[#111C30] text-slate-900 dark:text-[#F8FAFC]">Product Category</option>
                <option value="customer" className="bg-white dark:bg-[#111C30] text-slate-900 dark:text-[#F8FAFC]">Customer Account</option>
                <option value="payment_method" className="bg-white dark:bg-[#111C30] text-slate-900 dark:text-[#F8FAFC]">Payment Tender Method</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Aggregate Metric</label>
              <select
                value={customMetric}
                onChange={e => setCustomMetric(e.target.value as any)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#1F2E4D] bg-slate-50 dark:bg-[#0B1220] text-slate-900 dark:text-[#F8FAFC] font-bold focus:border-[#2563EB] focus:outline-hidden"
              >
                <option value="revenue" className="bg-white dark:bg-[#111C30] text-slate-900 dark:text-[#F8FAFC]">Total Revenue ({currency || '$'})</option>
                <option value="quantity" className="bg-white dark:bg-[#111C30] text-slate-900 dark:text-[#F8FAFC]">Units Sold Count</option>
                <option value="profit" className="bg-white dark:bg-[#111C30] text-slate-900 dark:text-[#F8FAFC]">Net Margin ({currency || '$'})</option>
              </select>
            </div>
          </div>

          <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#0B1220] rounded-2xl border border-slate-200 dark:border-[#1F2E4D]">
            <h4 className="font-bold text-xs text-slate-700 dark:text-[#94A3B8] mb-3">Aggregated Pivot Results</h4>
            <div className="space-y-2 text-xs">
              {pivotData.length === 0 ? (
                <div className="text-center p-6 text-slate-400 font-medium bg-white dark:bg-[#111C30] rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  No transaction data recorded yet for this grouping.
                </div>
              ) : (
                pivotData.map(item => (
                  <div key={item.dimensionValue} className="flex justify-between p-3 bg-white dark:bg-[#111C30] rounded-xl border border-slate-200 dark:border-[#1F2E4D]">
                    <span className="font-bold text-slate-900 dark:text-[#F8FAFC]">{item.dimensionValue}</span>
                    <span className="font-mono font-extrabold text-[#2563EB] dark:text-[#06B6D4]">
                      {customMetric === 'quantity'
                        ? `${item.aggValue} units`
                        : VelcoraPricingEngine.formatCurrency(item.aggValue, currency)
                      }
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
