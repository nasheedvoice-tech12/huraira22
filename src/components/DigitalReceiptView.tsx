import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SaleTransaction, BusinessProfile } from '../types';
import { VelcoraPricingEngine } from '../utils/pricingEngine';
import { generateBarcodeSvg } from '../utils/barcodeGenerator';
import { motion } from 'motion/react';
import { 
  Printer, 
  Download, 
  CheckCircle, 
  Calendar, 
  Hash, 
  CreditCard, 
  Building, 
  Phone, 
  Mail, 
  MapPin, 
  Loader2, 
  AlertCircle,
  Tag,
  ArrowLeft
} from 'lucide-react';
import { VelcoraMascot } from './VelcoraMascot';

interface DigitalReceiptViewProps {
  businessId: string;
  saleId: string;
  onBack?: () => void;
}

export function DigitalReceiptView({ businessId, saleId, onBack }: DigitalReceiptViewProps) {
  const [sale, setSale] = useState<SaleTransaction | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReceiptData() {
      setIsLoading(true);
      setError(null);
      try {
        if (!businessId || !saleId) {
          throw new Error('Invalid receipt lookup parameters.');
        }

        // Fetch business
        const bizRef = doc(db, 'businesses', businessId);
        const bizSnap = await getDoc(bizRef);
        let bizData: BusinessProfile | null = null;
        if (bizSnap.exists()) {
          bizData = { id: bizSnap.id, ...bizSnap.data() } as BusinessProfile;
          setBusiness(bizData);
        }

        // Fetch sale
        const saleRef = doc(db, 'businesses', businessId, 'sales', saleId);
        const saleSnap = await getDoc(saleRef);
        if (saleSnap.exists()) {
          setSale({ id: saleSnap.id, ...saleSnap.data() } as SaleTransaction);
        } else {
          throw new Error('Digital receipt record not found in database.');
        }
      } catch (err: any) {
        console.error('Receipt fetch error:', err);
        setError(err.message || 'Failed to retrieve digital receipt.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchReceiptData();
  }, [businessId, saleId]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070A14] flex flex-col items-center justify-center p-6 font-sans">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Retrieving Digital Receipt...</h3>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">Verifying secure receipt cryptograph & loading transaction</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070A14] flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-md bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] rounded-3xl p-6 sm:p-8 text-center shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center mx-auto text-rose-500">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">Unable to Load Receipt</h3>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">{error || 'Receipt or business record is unavailable.'}</p>
          </div>
          <div className="pt-3 flex gap-2 justify-center">
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Back to Dashboard
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-hover transition"
            >
              Retry Lookup
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currencySym = business?.currencySymbol || '$';
  const currencyCode = business?.currency || 'USD';
  
  // Robust field mappings for typed SaleTransaction
  const firstPayment = sale.payments?.[0];
  const paymentMethod = firstPayment ? firstPayment.method : 'cash';
  const discountTotal = sale.discountTotal || 0;
  const taxTotal = sale.taxTotal || 0;
  const pointsRedeemedAmount = sale.pointsRedeemed ? (sale.pointsRedeemed * 0.01) : 0;

  const formattedDate = sale.createdAt ? new Date(sale.createdAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }) : 'N/A';

  const barcodeSvgHtml = generateBarcodeSvg(sale.invoiceNumber, 220, 40);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070A14] py-6 sm:py-12 px-4 font-sans text-slate-800 dark:text-[#F8FAFC]">
      {/* Utilities Header / Brand Bar (Non-Printable) */}
      <div className="max-w-md mx-auto mb-5 flex items-center justify-between no-print gap-3">
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-extrabold text-slate-600 dark:text-[#94A3B8] hover:text-slate-950 dark:hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <VelcoraMascot size={28} />
            <span className="font-black text-xs tracking-wider text-slate-900 dark:text-white">VELCORA DIGITAL PASS</span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrint}
            className="p-2 rounded-xl bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-700 dark:text-zinc-300 hover:bg-slate-50 hover:text-slate-950 transition shadow-2xs"
            title="Print Receipt"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Virtual Paper Receipt Container */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md mx-auto bg-white text-slate-900 border-x border-slate-200 shadow-xl overflow-hidden relative print:border-0 print:shadow-none"
        style={{ contentVisibility: 'auto' }}
      >
        {/* Torn top paper ripple effect */}
        <div className="h-2 w-full bg-slate-200 dark:bg-zinc-800 no-print flex overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="w-4 h-4 bg-white rounded-full -mt-2 shrink-0" style={{ transform: 'rotate(45deg)' }}></div>
          ))}
        </div>

        {/* Receipt Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Header Section */}
          <div className="text-center space-y-3.5">
            <div className="flex justify-center">
              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-100 shadow-xs">
                <CheckCircle className="w-8 h-8 stroke-[1.5]" />
              </div>
            </div>
            
            <div className="space-y-1">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {business?.name || 'Velcora Retailer'}
              </h1>
              {business?.legalName && (
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  {business.legalName}
                </p>
              )}
            </div>

            {/* Custom Header Text */}
            {business?.receiptHeader && (
              <p className="text-[11px] font-medium text-slate-500 whitespace-pre-wrap px-4">
                {business.receiptHeader}
              </p>
            )}

            {/* Business Contact Metadata */}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-1 text-[11px] font-semibold text-slate-500 border-y border-dashed border-slate-200 py-2">
              {business?.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {business.address}
                </span>
              )}
              {business?.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {business.phone}
                </span>
              )}
            </div>
          </div>

          {/* Ticket Metadata block */}
          <div className="grid grid-cols-2 gap-y-2.5 text-[11px] font-medium text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-1">
              <Hash className="w-3 h-3 text-slate-400" />
              <span className="font-bold">Invoice</span>
            </div>
            <div className="text-right font-mono font-extrabold text-slate-900">{sale.invoiceNumber}</div>

            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>Date</span>
            </div>
            <div className="text-right font-semibold text-slate-800">{formattedDate}</div>

            <div className="flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-slate-400" />
              <span>Payment Method</span>
            </div>
            <div className="text-right font-extrabold text-slate-800 uppercase">{paymentMethod}</div>

            {sale.customerName && (
              <>
                <div>Customer</div>
                <div className="text-right font-semibold text-slate-800">{sale.customerName}</div>
              </>
            )}

            {sale.cashierName && (
              <>
                <div>Cashier</div>
                <div className="text-right font-semibold text-slate-800">{sale.cashierName}</div>
              </>
            )}
          </div>

          {/* Line Items Table */}
          <div className="space-y-2 pt-2">
            <h3 className="text-[11px] uppercase tracking-wider font-extrabold text-slate-400 border-b pb-1.5">
              Purchased Items
            </h3>
            <div className="divide-y divide-slate-100 font-medium">
              {sale.items.map((it, idx) => {
                const lineTotal = it.unitPrice * it.quantity - (it.discount || 0);
                return (
                  <div key={idx} className="py-2.5 flex items-start justify-between text-xs gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 truncate">{it.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        {VelcoraPricingEngine.formatCurrency(it.unitPrice, currencyCode)} × {it.quantity}
                        {it.discount ? ` (-${VelcoraPricingEngine.formatCurrency(it.discount, currencyCode)})` : ''}
                      </div>
                    </div>
                    <div className="text-right font-mono font-extrabold text-slate-900 shrink-0">
                      {VelcoraPricingEngine.formatCurrency(lineTotal, currencyCode)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Financial summary calculations block */}
          <div className="border-t border-double border-slate-300 pt-3 space-y-2 text-[11px] font-semibold text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-mono font-bold text-slate-900">
                {VelcoraPricingEngine.formatCurrency(sale.subtotal, currencyCode)}
              </span>
            </div>

            {discountTotal > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  Discount Savings
                </span>
                <span className="font-mono font-bold">
                  -{VelcoraPricingEngine.formatCurrency(discountTotal, currencyCode)}
                </span>
              </div>
            )}

            {sale.pointsRedeemed > 0 && (
              <div className="flex justify-between text-indigo-600">
                <span>Loyalty Redeemed ({sale.pointsRedeemed} pts)</span>
                <span className="font-mono font-bold">
                  -{VelcoraPricingEngine.formatCurrency(pointsRedeemedAmount, currencyCode)}
                </span>
              </div>
            )}

            {taxTotal > 0 && (
              <div className="flex justify-between">
                <span>Sales Tax ({business?.taxInclusive ? 'Inclusive' : 'Exclusive'})</span>
                <span className="font-mono font-bold text-slate-900">
                  {VelcoraPricingEngine.formatCurrency(taxTotal, currencyCode)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-sm font-black text-slate-950 border-t pt-2 mt-1">
              <span>GRAND TOTAL</span>
              <span className="font-mono text-base font-black">
                {VelcoraPricingEngine.formatCurrency(sale.grandTotal, currencyCode)}
              </span>
            </div>

            {paymentMethod === 'cash' && (
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-mono mt-3 text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Cash Received:</span>
                  <span className="font-extrabold text-slate-800">
                    {VelcoraPricingEngine.formatCurrency(firstPayment?.amount || sale.grandTotal, currencyCode)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Barcode SVG Rendering & Slogan */}
          <div className="text-center pt-3 border-t border-dashed border-slate-200 space-y-4">
            {/* Barcode */}
            <div className="flex flex-col items-center justify-center space-y-1">
              <div 
                className="no-print bg-white p-1 rounded-sm shadow-2xs select-none" 
                dangerouslySetInnerHTML={{ __html: barcodeSvgHtml }} 
              />
              <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400 font-bold">
                {sale.invoiceNumber}
              </span>
            </div>

            {/* Custom Footer Slogan */}
            <div className="space-y-1 px-4">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                Verification ID — {sale.id.slice(-6).toUpperCase()}
              </p>
              {business?.receiptFooter && (
                <p className="text-[11px] font-semibold text-slate-400 italic">
                  {business.receiptFooter}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Torn bottom paper ripple effect */}
        <div className="h-2 w-full bg-slate-200 dark:bg-zinc-800 no-print flex overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="w-4 h-4 bg-white rounded-full -mb-2 shrink-0" style={{ transform: 'rotate(45deg)' }}></div>
          ))}
        </div>
      </motion.div>

      {/* Standalone Receipt Print Styling injection */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .min-h-screen {
            min-height: auto !important;
            padding: 0 !important;
            background-color: white !important;
          }
          .shadow-xl, .shadow-2xl, .shadow-md, .shadow-sm, .shadow-2xs {
            box-shadow: none !important;
          }
          .border-x {
            border-left: 0 !important;
            border-right: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
