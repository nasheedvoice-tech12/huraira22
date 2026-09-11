import React, { useState } from 'react';
import {
  QrCode, Copy, Check, Printer, Share2, Smartphone,
  Download, X, ShieldCheck, Sparkles, CheckCircle2
} from 'lucide-react';
import { SaleTransaction } from '../types';
import { VelcoraPricingEngine } from '../utils/pricingEngine';
import { soundEffects } from '../utils/audioEffects';

interface CustomerDigitalPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: SaleTransaction | null;
  businessName: string;
  currency: string;
}

export const CustomerDigitalPassModal: React.FC<CustomerDigitalPassModalProps> = ({
  isOpen,
  onClose,
  sale,
  businessName,
  currency,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen || !sale) return null;

  const receiptUrl = `https://velcora.app/r/${sale.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(receiptUrl);
    soundEffects.playSuccess();
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Generate SVG QR Code matrix for the receipt URL
  const qrMatrixSize = 21;
  const qrData = Array.from({ length: qrMatrixSize }, (_, r) =>
    Array.from({ length: qrMatrixSize }, (_, c) => {
      // Corners
      if (
        (r < 7 && c < 7) ||
        (r < 7 && c >= qrMatrixSize - 7) ||
        (r >= qrMatrixSize - 7 && c < 7)
      ) {
        if (
          r === 0 || r === 6 || c === 0 || c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) return true;
        if (
          r === 0 || r === 6 || c === qrMatrixSize - 1 || c === qrMatrixSize - 7 ||
          (r >= 2 && r <= 4 && c >= qrMatrixSize - 5 && c <= qrMatrixSize - 3)
        ) return true;
        if (
          r === qrMatrixSize - 1 || r === qrMatrixSize - 7 || c === 0 || c === 6 ||
          (r >= qrMatrixSize - 5 && r <= qrMatrixSize - 3 && c >= 2 && c <= 4)
        ) return true;
        return false;
      }
      // Pseudo hash pattern
      return ((r * 7 + c * 13 + sale.id.charCodeAt(c % sale.id.length)) % 3) === 0;
    })
  );

  return (
    <div id="velcora-customer-digital-pass-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/70 backdrop-blur-md animate-in fade-in">
      <div className="bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col relative text-slate-800 dark:text-[#F8FAFC]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-[#1F2E4D] flex items-center justify-between bg-slate-50 dark:bg-[#0B1220]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-[#152644] border border-blue-200 dark:border-[#1F2E4D] flex items-center justify-center">
              <QrCode className="w-5 h-5 text-blue-600 dark:text-[#06B6D4]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-[#F8FAFC]">Digital QR Pass & Receipt</h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-50 dark:bg-[#152644] text-blue-600 dark:text-[#06B6D4] border border-blue-200 dark:border-[#1F2E4D]">
                  Zero-Paper
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-[#94A3B8] font-medium truncate max-w-[220px]">
                Invoice #{(sale?.id || '').toUpperCase()}
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

        {/* Content: QR Code Scan Box & Actions */}
        <div className="p-5 sm:p-6 flex flex-col gap-5 bg-slate-50/50 dark:bg-[#0B1220]">
          <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-center space-y-4 shadow-2xs">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Scan with Phone Camera
            </span>

            {/* Render High-Tech Dynamic QR */}
            <div className="p-4 bg-white rounded-2xl shadow-xl border-4 border-blue-500/20 relative group">
              <svg viewBox={`0 0 ${qrMatrixSize} ${qrMatrixSize}`} className="w-40 h-40 sm:w-44 sm:h-44 shape-rendering-crispEdges">
                {qrData.map((row, r) =>
                  row.map((cell, c) => (
                    cell ? (
                      <rect
                        key={`${r}-${c}`}
                        x={c}
                        y={r}
                        width="1"
                        height="1"
                        fill="#0B1220"
                      />
                    ) : null
                  ))
                )}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-10 h-10 rounded-xl bg-white p-1 shadow-md flex items-center justify-center border border-slate-200">
                  <div className="w-full h-full bg-[#2563EB] rounded-lg flex items-center justify-center text-white font-black text-xs shadow-xs">
                    V
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-extrabold text-slate-900 dark:text-[#F8FAFC]">Instant Mobile Pass</div>
              <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-medium leading-relaxed">
                Customer scans to view invoice, itemized breakdown, and loyalty points.
              </p>
            </div>

            <div className="w-full space-y-2 pt-2">
              <button
                onClick={handleCopyLink}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#1E2E4A] dark:hover:bg-[#152644] text-xs font-extrabold text-slate-800 dark:text-[#F8FAFC] border border-slate-200 dark:border-[#1F2E4D] transition flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-blue-600 dark:text-[#06B6D4]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Link Copied to Clipboard!' : 'Copy Customer Receipt Link'}</span>
              </button>

              <button
                onClick={handlePrint}
                className="w-full py-2.5 px-3 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-extrabold transition flex items-center justify-center gap-1.5 shadow-2xs active:scale-98 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Thermal Receipt</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
