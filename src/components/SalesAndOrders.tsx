import React, { useState, useMemo } from 'react';
import { useVelcora } from '../context/VelcoraContext';
import {
  FileText, Calendar, Clock, DollarSign, CheckCircle2,
  AlertCircle, ArrowRight, Plus, Search, Printer, RotateCcw,
  Eye, Download, QrCode, X, Check, ShieldCheck, Tag
} from 'lucide-react';
import { SaleTransaction, SaleOrder, Estimate } from '../types';
import { VelcoraPricingEngine } from '../utils/pricingEngine';
import { generateBarcodeSvg } from '../utils/barcodeGenerator';
import { printThermalReceipt, printStandardInvoice, downloadReceiptAsText } from '../utils/receiptPrinter';
import { CustomerDigitalPassModal } from './CustomerDigitalPassModal';
import { useTranslation } from '../context/TranslationContext';

export const SalesAndOrders: React.FC = () => {
  const {
    salesHistory,
    saleOrders,
    estimates,
    convertEstimateToSale,
    processSaleReturnOrExchange,
    currency,
    activeBusiness,
    activeSubuser} = useVelcora();
  const { t, locale, setLocale } = useTranslation();

  const [activeTab, setActiveTab] = useState<'invoices' | 'orders' | 'estimates'>('invoices');
  const [search, setSearch] = useState('');
  const [selectedSaleForView, setSelectedSaleForView] = useState<SaleTransaction | null>(null);
  const [showDigitalPass, setShowDigitalPass] = useState(false);

  // Return / Exchange Modal State
  const [saleForReturn, setSaleForReturn] = useState<SaleTransaction | null>(null);
  const [returnType, setReturnType] = useState<'return' | 'exchange'>('return');
  const [returnItemsState, setReturnItemsState] = useState<{ [productId: string]: number }>({});
  const [refundMethod, setRefundMethod] = useState<'cash' | 'card' | 'store_credit'>('cash');
  const [returnReason, setReturnReason] = useState('');
  const [returnSuccessMsg, setReturnSuccessMsg] = useState<string | null>(null);
  const [isProcessingReturn, setIsProcessingReturn] = useState(false);

  const handleOpenReturnModal = (sale: SaleTransaction) => {
    setSaleForReturn(sale);
    setReturnType('return');
    const initialQtys: { [productId: string]: number } = {};
    sale.items.forEach(it => {
      initialQtys[it.productId] = it.quantity;
    });
    setReturnItemsState(initialQtys);
    setRefundMethod('cash');
    setReturnReason('');
    setReturnSuccessMsg(null);
  };

  const handleExecuteReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleForReturn) return;

    const itemsToReturn = saleForReturn.items
      .filter(it => (returnItemsState[it.productId] || 0) > 0)
      .map(it => ({
        productId: it.productId,
        variantId: it.variantId,
        name: it.name,
        quantity: returnItemsState[it.productId] || 0,
        refundUnitPrice: it.unitPrice,
      }));

    if (itemsToReturn.length === 0) {
      alert('Please select at least 1 item and quantity to return.');
      return;
    }

    setIsProcessingReturn(true);
    const result = await processSaleReturnOrExchange({
      saleId: saleForReturn.id,
      type: returnType,
      returnedItems: itemsToReturn,
      refundMethod,
      reason: returnReason.trim() || undefined,
    });
    setIsProcessingReturn(false);

    if (result.success) {
      setReturnSuccessMsg(`Return completed successfully! Credit Note: ${result.creditNote?.creditNoteNumber}`);
      setTimeout(() => {
        setSaleForReturn(null);
        setReturnSuccessMsg(null);
      }, 2200);
    }
  };

  // Filtered lists
  const filteredSales = useMemo(() => {
    if (!search.trim()) return salesHistory || [];
    const q = search.toLowerCase();
    return (salesHistory || []).filter(
      s =>
        (s.invoiceNumber || '').toLowerCase().includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q))
    );
  }, [salesHistory, search]);

  const filteredOrders = useMemo(() => {
    if (!search.trim()) return saleOrders || [];
    const q = search.toLowerCase();
    return (saleOrders || []).filter(
      o =>
        (o.orderNumber || '').toLowerCase().includes(q) ||
        (o.customerName && o.customerName.toLowerCase().includes(q))
    );
  }, [saleOrders, search]);

  const filteredEstimates = useMemo(() => {
    if (!search.trim()) return estimates || [];
    const q = search.toLowerCase();
    return (estimates || []).filter(
      e =>
        (e.estimateNumber || '').toLowerCase().includes(q) ||
        (e.customerName && e.customerName.toLowerCase().includes(q))
    );
  }, [estimates, search]);

  return (
    <div id="velcora-sales-orders-view" className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#111C30] p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary p-0.5 shadow-2xs">
            <div className="w-full h-full rounded-[14px] bg-white dark:bg-[#111C30] flex items-center justify-center text-primary dark:text-[#4F8CFF]">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-[#F8FAFC]">
              Sales, Invoices & Orders
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">
              {salesHistory.length} completed sales • {saleOrders.length} active orders • {estimates.length} quotes
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search invoice or customer..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-xs text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 font-medium focus:outline-hidden focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] p-1 rounded-2xl w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`flex-1 sm:flex-none text-center px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'invoices'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC]'
              }`}
            >
              Invoices ({filteredSales.length})
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex-1 sm:flex-none text-center px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'orders'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC]'
              }`}
            >
              Orders ({filteredOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('estimates')}
              className={`flex-1 sm:flex-none text-center px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'estimates'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC]'
              }`}
            >
              Quotes ({filteredEstimates.length})
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          TAB 1: INVOICES & SALES HISTORY TABLE
      ======================================================== */}
      {activeTab === 'invoices' && (
        <div className="bg-white dark:bg-[#111C30] rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[750px]">
            <thead className="bg-slate-50 dark:bg-[#0B1220] border-b border-slate-200 dark:border-[#1F2E4D] text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider font-extrabold text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">{t('customer')}</th>
                <th className="py-3.5 px-4">Items</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4 text-right">{t('grand_total')}</th>
                <th className="py-3.5 px-4 text-center">Receipt & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1F2E4D] font-medium text-slate-700 dark:text-[#94A3B8]">
              {filteredSales.map(sale => (
                <tr
                  key={sale.id}
                  onClick={() => setSelectedSaleForView(sale)}
                  className="hover:bg-slate-50 dark:hover:bg-[#152644]/50 transition cursor-pointer"
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-primary dark:text-[#4F8CFF]">
                    {sale.invoiceNumber}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 dark:text-[#94A3B8]">
                    {new Date(sale.createdAt).toLocaleDateString()}{' '}
                    {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-[#F8FAFC]">
                    {sale.customerName || t('walk_in')}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 dark:text-[#94A3B8]">
                    {sale.items.reduce((s, i) => s + i.quantity, 0)} units
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold px-2.5 py-0.5 rounded-xl bg-primary/10 text-primary border border-primary/20 text-[10px] uppercase w-fit">
                        {sale.payments.map(p => p.method).join(' + ')}
                      </span>
                      {sale.status === 'returned' && (
                        <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded-md border border-rose-200 dark:border-rose-900/40 w-fit">
                          Returned
                        </span>
                      )}
                      {sale.status === 'partial' && (
                        <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/40 w-fit">
                          Partial Return
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 dark:text-[#F8FAFC] text-sm">
                    {VelcoraPricingEngine.formatCurrency(sale.grandTotal, currency)}
                    {sale.refundedAmount ? (
                      <div className="text-[10px] text-rose-500 dark:text-rose-400 font-semibold">
                        Refunded: -{VelcoraPricingEngine.formatCurrency(sale.refundedAmount, currency)}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-3.5 px-4 text-center" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() =>
                          printThermalReceipt({
                            sale,
                            business: activeBusiness,
                            currency,
                            cashierName: sale.cashierName || activeSubuser?.name || 'Cashier',
                          })
                        }
                        title="Print Thermal 80mm Receipt"
                        className="p-1.5 rounded-lg bg-primary-light text-primary hover:bg-primary/20 transition"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenReturnModal(sale)}
                        title="Process Return / Exchange"
                        className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/25 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setSelectedSaleForView(sale)}
                        title="View Full Invoice Details"
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#152644] text-slate-600 dark:text-[#94A3B8] hover:bg-slate-200 dark:hover:bg-[#1E2E4A] transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: SALES ORDERS
      ======================================================== */}
      {activeTab === 'orders' && (
        <div className="bg-white dark:bg-[#111C30] rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[750px]">
            <thead className="bg-slate-50 dark:bg-[#0B1220] border-b border-slate-200 dark:border-[#1F2E4D] text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider font-extrabold text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Order #</th>
                <th className="py-3.5 px-4">{t('customer')}</th>
                <th className="py-3.5 px-4">Expected Delivery</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Deposit / Total</th>
                <th className="py-3.5 px-4 text-right">Balance Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1F2E4D] font-medium text-slate-700 dark:text-[#94A3B8]">
              {filteredOrders.map(so => (
                <tr key={so.id} className="hover:bg-slate-50 dark:hover:bg-[#152644]/50 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-primary dark:text-[#4F8CFF]">{so.orderNumber}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-[#F8FAFC]">{so.customerName}</td>
                  <td className="py-3.5 px-4 text-slate-500 dark:text-[#94A3B8]">
                    {so.deliveryDeadline || so.deliveryDate
                      ? new Date(so.deliveryDeadline || so.deliveryDate!).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 text-[11px] uppercase">
                      {so.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 dark:text-[#94A3B8] font-bold">
                    {VelcoraPricingEngine.formatCurrency(so.advanceDeposit || 0, currency)} /{' '}
                    {VelcoraPricingEngine.formatCurrency(so.grandTotal, currency)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-rose-600 dark:text-rose-400">
                    {VelcoraPricingEngine.formatCurrency(so.grandTotal - (so.advanceDeposit || 0), currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: ESTIMATES & QUOTES
      ======================================================== */}
      {activeTab === 'estimates' && (
        <div className="bg-white dark:bg-[#111C30] rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[750px]">
            <thead className="bg-slate-50 dark:bg-[#0B1220] border-b border-slate-200 dark:border-[#1F2E4D] text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider font-extrabold text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Quote #</th>
                <th className="py-3.5 px-4">{t('customer')}</th>
                <th className="py-3.5 px-4">Valid Until</th>
                <th className="py-3.5 px-4">Quoted Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">1-Click Convert</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1F2E4D] font-medium text-slate-700 dark:text-[#94A3B8]">
              {filteredEstimates.map(est => (
                <tr key={est.id} className="hover:bg-slate-50 dark:hover:bg-[#152644]/50 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-primary dark:text-[#4F8CFF]">{est.estimateNumber}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-[#F8FAFC]">{est.customerName}</td>
                  <td className="py-3.5 px-4 text-slate-500 dark:text-[#94A3B8]">{new Date(est.validUntil).toLocaleDateString()}</td>
                  <td className="py-3.5 px-4 font-extrabold text-slate-900 dark:text-[#F8FAFC]">
                    {VelcoraPricingEngine.formatCurrency(est.grandTotal, currency)}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] uppercase">
                      {est.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {est.status !== 'converted' && (
                      <button
                        onClick={() => convertEstimateToSale(est.id)}
                        className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white font-bold text-[11px] rounded-xl shadow-2xs transition active:scale-98"
                      >
                        Convert to Invoice
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* ========================================================
          INVOICE & RECEIPT REPRINT INSPECTOR MODAL
      ======================================================== */}
      {selectedSaleForView && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111C30] rounded-3xl max-w-lg w-full p-5 sm:p-6 border border-slate-200 dark:border-[#1F2E4D] shadow-2xl space-y-4 text-slate-800 dark:text-[#F8FAFC] max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#1F2E4D]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary-light text-primary flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-[#F8FAFC]">
                    Invoice #{selectedSaleForView.invoiceNumber}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-[#94A3B8]">
                    Recorded on {new Date(selectedSaleForView.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedSaleForView(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Summary Grid */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-[#0B1220] p-3 rounded-2xl border border-slate-200 dark:border-[#1F2E4D] text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-[#94A3B8] block">{t('customer')}</span>
                <span className="font-bold text-slate-800 dark:text-[#F8FAFC]">{selectedSaleForView.customerName || 'Walk-in'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-[#94A3B8] block">Payment Method</span>
                <span className="font-bold text-slate-800 dark:text-[#F8FAFC] uppercase">
                  {selectedSaleForView.payments.map(p => p.method).join(', ')}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-[#94A3B8] block">Status</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">{selectedSaleForView.status}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-[#94A3B8] block">Cashier</span>
                <span className="font-bold text-slate-800 dark:text-[#F8FAFC]">{selectedSaleForView.cashierName || 'POS Admin'}</span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 dark:border-[#1F2E4D] rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#0B1220] border-b border-slate-200 dark:border-[#1F2E4D] text-slate-700 dark:text-[#94A3B8] uppercase font-extrabold text-[10px]">
                  <tr>
                    <th className="p-2.5">Item</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Price</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1F2E4D] font-medium">
                  {selectedSaleForView.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5">
                        <div className="font-bold text-slate-800 dark:text-[#F8FAFC]">{it.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">SKU: {it.sku}</div>
                      </td>
                      <td className="p-2.5 text-center">{it.quantity}</td>
                      <td className="p-2.5 text-right">{VelcoraPricingEngine.formatCurrency(it.unitPrice, currency)}</td>
                      <td className="p-2.5 text-right font-bold text-slate-900 dark:text-[#F8FAFC]">
                        {VelcoraPricingEngine.formatCurrency(it.unitPrice * it.quantity - (it.discount || 0), currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="bg-slate-50 dark:bg-[#0B1220] p-3 rounded-2xl border border-slate-200 dark:border-[#1F2E4D] text-xs space-y-1">
              <div className="flex justify-between text-slate-600 dark:text-[#94A3B8]">
                <span>Subtotal:</span>
                <span>{VelcoraPricingEngine.formatCurrency(selectedSaleForView.subtotal, currency)}</span>
              </div>
              {selectedSaleForView.discountTotal > 0 && (
                <div className="flex justify-between text-rose-600 dark:text-rose-400">
                  <span>Discount:</span>
                  <span>-{VelcoraPricingEngine.formatCurrency(selectedSaleForView.discountTotal, currency)}</span>
                </div>
              )}
              {selectedSaleForView.taxTotal > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-[#94A3B8]">
                  <span>Tax / VAT:</span>
                  <span>{VelcoraPricingEngine.formatCurrency(selectedSaleForView.taxTotal, currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm text-slate-900 dark:text-[#F8FAFC] pt-1 border-t border-slate-200 dark:border-[#1F2E4D]">
                <span>Grand Total:</span>
                <span>{VelcoraPricingEngine.formatCurrency(selectedSaleForView.grandTotal, currency)}</span>
              </div>
            </div>

            {/* Barcode & Print Action Buttons */}
            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    printThermalReceipt({
                      sale: selectedSaleForView,
                      business: activeBusiness,
                      currency,
                      cashierName: selectedSaleForView.cashierName || 'Cashier',
                    })
                  }
                  className="py-2.5 px-3 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Thermal (80mm)</span>
                </button>

                <button
                  onClick={() =>
                    printStandardInvoice({
                      sale: selectedSaleForView,
                      business: activeBusiness,
                      currency,
                      cashierName: selectedSaleForView.cashierName || 'Cashier',
                    })
                  }
                  className="py-2.5 px-3 rounded-2xl bg-slate-900 dark:bg-zinc-100 hover:opacity-90 text-white dark:text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition"
                >
                  <FileText className="w-4 h-4" />
                  <span>Print A4 Invoice</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowDigitalPass(true)}
                  className="py-2 px-3 rounded-xl bg-primary-light text-primary border border-primary/20 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Digital QR Pass</span>
                </button>

                <button
                  onClick={() =>
                    downloadReceiptAsText({
                      sale: selectedSaleForView,
                      business: activeBusiness,
                      currency,
                    })
                  }
                  className="py-2 px-3 rounded-xl border border-slate-200 dark:border-[#1F2E4D] text-slate-700 dark:text-[#94A3B8] font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-[#1E2E4A] transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export TXT</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Digital QR Pass Modal */}
      {selectedSaleForView && (
        <CustomerDigitalPassModal
          isOpen={showDigitalPass}
          onClose={() => setShowDigitalPass(false)}
          sale={selectedSaleForView}
          businessName={activeBusiness.name}
          currency={currency}
        />
      )}

      {/* ========================================================
          RETURN / EXCHANGE PROCESSING MODAL
      ======================================================== */}
      {saleForReturn && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleExecuteReturn}
            className="bg-white dark:bg-[#111C30] rounded-3xl max-w-lg w-full p-5 sm:p-6 border border-slate-200 dark:border-[#1F2E4D] shadow-2xl space-y-4 text-slate-800 dark:text-[#F8FAFC] max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#1F2E4D]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-[#F8FAFC]">
                    Process Return / Exchange
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-[#94A3B8]">
                    Invoice #{saleForReturn.invoiceNumber} • {saleForReturn.customerName || 'Walk-in'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSaleForReturn(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {returnSuccessMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{returnSuccessMsg}</span>
              </div>
            )}

            {/* Type selector */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-[#0B1220] p-1.5 rounded-2xl border border-slate-200 dark:border-[#1F2E4D]">
              <button
                type="button"
                onClick={() => setReturnType('return')}
                className={`py-1.5 text-xs font-bold rounded-xl transition ${
                  returnType === 'return'
                    ? 'bg-primary text-white shadow-2xs'
                    : 'text-slate-600 dark:text-[#94A3B8]'
                }`}
              >
                Standard Return (Refund)
              </button>
              <button
                type="button"
                onClick={() => setReturnType('exchange')}
                className={`py-1.5 text-xs font-bold rounded-xl transition ${
                  returnType === 'exchange'
                    ? 'bg-primary text-white shadow-2xs'
                    : 'text-slate-600 dark:text-[#94A3B8]'
                }`}
              >
                Item Exchange
              </button>
            </div>

            {/* Select items to return */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-[#94A3B8]">
                Select Items & Quantities to Restock/Refund:
              </label>
              <div className="border border-slate-200 dark:border-[#1F2E4D] rounded-2xl divide-y divide-slate-100 dark:divide-[#1F2E4D] overflow-hidden">
                {saleForReturn.items.map(it => {
                  const currQty = returnItemsState[it.productId] ?? 0;
                  return (
                    <div key={it.productId} className="p-3 flex items-center justify-between gap-3 text-xs bg-white dark:bg-[#111C30]">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 dark:text-[#F8FAFC] truncate">{it.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Purchased: {it.quantity} @ {VelcoraPricingEngine.formatCurrency(it.unitPrice, currency)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] text-slate-500 font-medium">Return Qty:</label>
                        <input
                          type="number"
                          min="0"
                          max={it.quantity}
                          value={currQty}
                          onChange={e => {
                            const val = Math.max(0, Math.min(it.quantity, parseInt(e.target.value) || 0));
                            setReturnItemsState(prev => ({ ...prev, [it.productId]: val }));
                          }}
                          className="w-16 px-2 py-1 bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] rounded-lg text-center font-bold text-slate-900 dark:text-[#F8FAFC]"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Refund method & Reason */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-[#94A3B8] mb-1">
                  Refund Method
                </label>
                <select
                  value={refundMethod}
                  onChange={e => setRefundMethod(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-xs font-medium text-slate-900 dark:text-[#F8FAFC]"
                >
                  <option value="cash">Cash Refund</option>
                  <option value="card">Card Reversal</option>
                  <option value="store_credit">Store Credit (Customer Balance)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-[#94A3B8] mb-1">
                  Return Reason
                </label>
                <input
                  type="text"
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                  placeholder="e.g. Defective, Wrong Size, Customer Request"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-xs text-slate-900 dark:text-[#F8FAFC]"
                />
              </div>
            </div>

            {/* Estimated Total Refund */}
            {(() => {
              const totalRefundEst = saleForReturn.items.reduce((sum, it) => {
                const qty = returnItemsState[it.productId] || 0;
                return sum + qty * it.unitPrice;
              }, 0);
              return (
                <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-200">
                  <span>Total Calculated Refund:</span>
                  <span className="text-sm font-extrabold">{VelcoraPricingEngine.formatCurrency(totalRefundEst, currency)}</span>
                </div>
              );
            })()}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#1F2E4D]">
              <button
                type="button"
                onClick={() => setSaleForReturn(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-[#1F2E4D] text-slate-600 dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-[#1E2E4A]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessingReturn}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-primary hover:bg-primary-hover text-white shadow-2xs transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {isProcessingReturn ? 'Processing...' : 'Confirm Return & Restock'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
