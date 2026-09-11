import { SaleTransaction, BusinessProfile, CartItem } from '../types';
import { generateBarcodeSvg, generateQrMatrixSvg } from './barcodeGenerator';
import { VelcoraPricingEngine } from './pricingEngine';

export interface PrintReceiptOptions {
  sale: SaleTransaction;
  business: BusinessProfile;
  currency?: string;
  cashierName?: string;
  customerName?: string;
  notes?: string;
  format?: 'thermal80' | 'thermal58' | 'a4';
}

// self-contained robust receipt translation registry
const RECEIPT_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    invoice: 'INVOICE',
    inv_label: 'INV:',
    date: 'Date:',
    cashier: 'Cashier:',
    customer: 'Customer:',
    item_qty: 'ITEM / QTY',
    amount: 'AMOUNT',
    subtotal: 'Subtotal:',
    discount: 'Discount:',
    tax: 'Tax / VAT:',
    loyalty_points_redeemed: 'Loyalty Points Redeemed:',
    grand_total: 'GRAND TOTAL:',
    change_due: 'Change Due:',
    points_earned: '★ You earned {points} Loyalty Points on this purchase! ★',
    powered_by: 'Powered by Velcora Intelligence ERP',
    invoice_title: 'Invoice',
    billed_to: 'Billed To',
    account: 'Account:',
    direct_customer: 'Direct Cash Customer',
    payment_channel: 'Payment & Channel Details',
    status: 'Status:',
    channel: 'Channel:',
    cashier_attendant: 'Cashier / Attendant:',
    amount_due: 'Amount Due:',
    payment: 'Payment:',
    item_description: 'Item Description',
    qty: 'Qty',
    unit_price: 'Unit Price',
    total: 'Total',
    tel: 'Tel:',
    email: 'Email:',
    tax_reg: 'Tax/VAT Reg:',
    thank_you: 'Thank you for your business! Please visit again.',
    points_earned_label: 'Points Earned:',
    cash: 'Cash',
    card: 'Card',
    bank: 'Bank Transfer',
    wallet: 'Mobile Wallet',
    store_credit: 'Store Credit'
  },
  ur: {
    invoice: 'انوائس / بل',
    inv_label: 'بل نمبر:',
    date: 'تاریخ:',
    cashier: 'کیشیئر:',
    customer: 'گاہک:',
    item_qty: 'آئٹم / تعداد',
    amount: 'رقم',
    subtotal: 'ذیلی کل:',
    discount: 'رعایت:',
    tax: 'ٹیکس / VAT:',
    loyalty_points_redeemed: 'استعمال شدہ پوائنٹس:',
    grand_total: 'کل رقم:',
    change_due: 'بقایا رقم:',
    points_earned: '★ آپ نے اس خریداری پر {points} لائلٹی پوائنٹس حاصل کیے! ★',
    powered_by: 'ویلکورا انٹیلیجنس ERP کی پیشکش',
    invoice_title: 'انوائس',
    billed_to: 'بل بنام',
    account: 'اکاؤنٹ نمبر:',
    direct_customer: 'عام خریدار',
    payment_channel: 'ادائیگی اور چینل کی تفصیلات',
    status: 'حیثیت:',
    channel: 'چینل:',
    cashier_attendant: 'کیشیئر / اٹینڈنٹ:',
    amount_due: 'کل واجب الادا:',
    payment: 'ادائیگی:',
    item_description: 'تفصیل اشیاء',
    qty: 'تعداد',
    unit_price: 'فی قیمت',
    total: 'کل رقم',
    tel: 'فون:',
    email: 'ای میل:',
    tax_reg: 'ٹیکس رجسٹریشن:',
    thank_you: 'کاروبار کے لیے آپ کا شکریہ! دوبارہ تشریف لائیں۔',
    points_earned_label: 'حاصل کردہ پوائنٹس:',
    cash: 'نقد',
    card: 'کارڈ',
    bank: 'بینک ٹرانسفر',
    wallet: 'موبائل والیٹ',
    store_credit: 'اسٹور کریڈٹ / ادھار کھاتہ'
  },
  ar: {
    invoice: 'فاتورة مبيعات',
    inv_label: 'رقم الفاتورة:',
    date: 'التاريخ:',
    cashier: 'الكاشير:',
    customer: 'العميل:',
    item_qty: 'الصنف / الكمية',
    amount: 'المبلغ',
    subtotal: 'المجموع الفرعي:',
    discount: 'الخصم:',
    tax: 'الضريبة:',
    loyalty_points_redeemed: 'نقاط مستبدلة:',
    grand_total: 'المجموع الإجمالي:',
    change_due: 'المتبقي للعميل:',
    points_earned: '★ لقد ربحت {points} من نقاط الولاء على هذه العملية! ★',
    powered_by: 'مشغل بواسطة نظام فيلكورا الذكي',
    invoice_title: 'فاتورة',
    billed_to: 'فاتورة إلى',
    account: 'رقم الحساب:',
    direct_customer: 'عميل نقدي عام',
    payment_channel: 'تفاصيل الدفع والقناة',
    status: 'الحالة:',
    channel: 'القناة:',
    cashier_attendant: 'الكاشير / الموظف:',
    amount_due: 'المبلغ المطلوب:',
    payment: 'الدفع:',
    item_description: 'وصف الصنف',
    qty: 'الكمية',
    unit_price: 'سعر الوحدة',
    total: 'الإجمالي',
    tel: 'الهاتف:',
    email: 'البريد الإلكتروني:',
    tax_reg: 'الرقم الضريبي:',
    thank_you: 'نشكركم على تعاملكم معنا! نتطلع لزيارتكم مجدداً.',
    points_earned_label: 'نقاط مكتسبة:',
    cash: 'نقداً',
    card: 'بطاقة مصرفية',
    bank: 'تحويل بنكي',
    wallet: 'محفظة إلكترونية',
    store_credit: 'آجل / حساب العميل'
  },
  zh: {
    invoice: '销售发票',
    inv_label: '发票号:',
    date: '日期:',
    cashier: '收银员:',
    customer: '客户:',
    item_qty: '商品 / 数量',
    amount: '金额',
    subtotal: '小计:',
    discount: '折扣:',
    tax: '税额:',
    loyalty_points_redeemed: '已兑换积分:',
    grand_total: '实付总计:',
    change_due: '找零:',
    points_earned: '★ 此次消费您赚取了 {points} 会员积分！ ★',
    powered_by: '由 Velcora 智能 ERP 提供技术支持',
    invoice_title: '发票',
    billed_to: '账单寄送至',
    account: '账户:',
    direct_customer: '散客',
    payment_channel: '付款及渠道详情',
    status: '状态:',
    channel: '渠道:',
    cashier_attendant: '收银员/服务员:',
    amount_due: '应付金额:',
    payment: '付款:',
    item_description: '商品描述',
    qty: '数量',
    unit_price: '单价',
    total: '总价',
    tel: '电话:',
    email: '电子邮件:',
    tax_reg: '税号:',
    thank_you: '感谢您的光临！欢迎下次光临。',
    points_earned_label: '赚取积分:',
    cash: '现金',
    card: '银行卡',
    bank: '银行转账',
    wallet: '电子钱包',
    store_credit: '店内信用'
  },
  es: {
    invoice: 'FACTURA',
    inv_label: 'FACT:',
    date: 'Fecha:',
    cashier: 'Cajero:',
    customer: 'Cliente:',
    item_qty: 'ARTÍCULO / CANT',
    amount: 'TOTAL',
    subtotal: 'Subtotal:',
    discount: 'Descuento:',
    tax: 'Impuesto:',
    loyalty_points_redeemed: 'Puntos Canjeados:',
    grand_total: 'TOTAL GENERAL:',
    change_due: 'Cambio:',
    points_earned: '★ ¡Has ganado {points} Puntos de Lealtad en esta compra! ★',
    powered_by: 'Desarrollado por Velcora Intelligence ERP',
    invoice_title: 'Factura',
    billed_to: 'Facturado a',
    account: 'Cuenta:',
    direct_customer: 'Cliente de Caja General',
    payment_channel: 'Detalles de Pago & Canal',
    status: 'Estado:',
    channel: 'Canal:',
    cashier_attendant: 'Cajero / Atendente:',
    amount_due: 'Monto a Pagar:',
    payment: 'Pago:',
    item_description: 'Descripción del Artículo',
    qty: 'Cant',
    unit_price: 'Precio Unitario',
    total: 'Total',
    tel: 'Tel:',
    email: 'Email:',
    tax_reg: 'Reg. Fiscal:',
    thank_you: '¡Gracias por su compra! Vuelva pronto.',
    points_earned_label: 'Puntos Ganados:',
    cash: 'Efectivo',
    card: 'Tarjeta',
    bank: 'Transferencia Bancaria',
    wallet: 'Billetera Digital',
    store_credit: 'Crédito en Tienda'
  },
  fr: {
    invoice: 'FACTURE',
    inv_label: 'FACT:',
    date: 'Date:',
    cashier: 'Caissier:',
    customer: 'Client:',
    item_qty: 'ARTICLE / QTÉ',
    amount: 'MONTANT',
    subtotal: 'Sous-total:',
    discount: 'Remise:',
    tax: 'Taxe / TVA:',
    loyalty_points_redeemed: 'Points Fidélité Utilisés:',
    grand_total: 'TOTAL GÉNÉRAL:',
    change_due: 'Monnaie Rendue:',
    points_earned: '★ Vous avez gagné {points} Points de Fidélité lors de cet achat ! ★',
    powered_by: 'Propulsé par Velcora Intelligence ERP',
    invoice_title: 'Facture',
    billed_to: 'Facturé à',
    account: 'Compte:',
    direct_customer: 'Client Comptant',
    payment_channel: 'Détails de Paiement & Canal',
    status: 'Statut:',
    channel: 'Canal:',
    cashier_attendant: 'Caissier / Hôte:',
    amount_due: 'Montant Dû:',
    payment: 'Paiement:',
    item_description: 'Description de l\'article',
    qty: 'Qté',
    unit_price: 'Prix Unitaire',
    total: 'Total',
    tel: 'Tél:',
    email: 'Email:',
    tax_reg: 'N° TVA:',
    thank_you: 'Merci pour votre confiance ! À bientôt.',
    points_earned_label: 'Points Gagnés:',
    cash: 'Espèces',
    card: 'Carte',
    bank: 'Virement Bancaire',
    wallet: 'Portefeuille Mobile',
    store_credit: 'Crédit Magasin'
  },
  de: {
    invoice: 'RECHNUNG',
    inv_label: 'RECH:',
    date: 'Datum:',
    cashier: 'Kassierer:',
    customer: 'Kunde:',
    item_qty: 'ARTIKEL / MENGE',
    amount: 'BETRAG',
    subtotal: 'Zwischensumme:',
    discount: 'Rabatt:',
    tax: 'Steuer / MwSt:',
    loyalty_points_redeemed: 'Eingelöste Treuepunkte:',
    grand_total: 'GESAMTSUMME:',
    change_due: 'Rückgeld:',
    points_earned: '★ Sie haben bei diesem Einkauf {points} Treuepunkte gesammelt! ★',
    powered_by: 'Unterstützt von Velcora Intelligence ERP',
    invoice_title: 'Rechnung',
    billed_to: 'Rechnungsempfänger',
    account: 'Konto:',
    direct_customer: 'Direktzahler-Kunde',
    payment_channel: 'Zahlungsdetails & Kanal',
    status: 'Status:',
    channel: 'Kanal:',
    cashier_attendant: 'Kassierer / Betreuer:',
    amount_due: 'Fälliger Betrag:',
    payment: 'Zahlung:',
    item_description: 'Artikelbeschreibung',
    qty: 'Menge',
    unit_price: 'Einzelpreis',
    total: 'Gesamt',
    tel: 'Tel:',
    email: 'E-Mail:',
    tax_reg: 'USt-IdNr:',
    thank_you: 'Vielen Dank für Ihren Einkauf! Auf Wiedersehen.',
    points_earned_label: 'Gesammelte Punkte:',
    cash: 'Bar',
    card: 'Karte',
    bank: 'Überweisung',
    wallet: 'Mobiles Wallet',
    store_credit: 'Ladenguthaben'
  },
  pt: {
    invoice: 'FATURA',
    inv_label: 'FAT:',
    date: 'Data:',
    cashier: 'Caixa:',
    customer: 'Cliente:',
    item_qty: 'ITEM / QTD',
    amount: 'VALOR',
    subtotal: 'Subtotal:',
    discount: 'Desconto:',
    tax: 'Impostos / IVA:',
    loyalty_points_redeemed: 'Pontos de Fidelidade Resgatados:',
    grand_total: 'TOTAL GERAL:',
    change_due: 'Troco:',
    points_earned: '★ Você ganhou {points} Pontos de Fidelidade nesta compra! ★',
    powered_by: 'Distribuído por Velcora Intelligence ERP',
    invoice_title: 'Fatura',
    billed_to: 'Faturado para',
    account: 'Conta:',
    direct_customer: 'Cliente Balcão',
    payment_channel: 'Detalhes do Pagamento & Canal',
    status: 'Status:',
    channel: 'Canal:',
    cashier_attendant: 'Operador de Caixa:',
    amount_due: 'Valor Devido:',
    payment: 'Pagamento:',
    item_description: 'Descrição do Item',
    qty: 'Qtd',
    unit_price: 'Preço Unitário',
    total: 'Total',
    tel: 'Tel:',
    email: 'E-mail:',
    tax_reg: 'NIF:',
    thank_you: 'Obrigado pela sua preferência! Volte sempre.',
    points_earned_label: 'Pontos Ganhos:',
    cash: 'Dinheiro',
    card: 'Cartão',
    bank: 'Transferência Bancária',
    wallet: 'Carteira Digital',
    store_credit: 'Crédito na Loja'
  }
};

/**
 * Helper to translate labels dynamically inside the receipt based on business configuration
 */
export function getReceiptTranslation(key: string, languageCode: string, fallback: string): string {
  const code = (languageCode || 'en').toLowerCase();
  const dict = RECEIPT_TRANSLATIONS[code] || RECEIPT_TRANSLATIONS.en;
  return dict[key] || RECEIPT_TRANSLATIONS.en[key] || fallback;
}

/**
 * Generates standalone clean HTML for a Thermal POS Receipt (80mm / 58mm)
 */
export function generateThermalReceiptHtml(options: PrintReceiptOptions): string {
  const { sale, business, currency = 'USD', cashierName = sale.cashierName || 'Cashier', customerName = sale.customerName || 'Walk-in Customer' } = options;
  const is58mm = options.format === 'thermal58';
  const widthMm = is58mm ? '58mm' : '80mm';
  const barcodeSvg = generateBarcodeSvg(sale.invoiceNumber, is58mm ? 140 : 200, 32);

  const origin = typeof window !== 'undefined' ? (window.location.origin + window.location.pathname) : 'https://velcora.app';
  const digitalReceiptUrl = `${origin}?b=${business.id}&s=${sale.id}`;
  const qrCodeSvg = generateQrMatrixSvg(digitalReceiptUrl, is58mm ? 90 : 110);

  const receiptLanguage = business.language || 'en';
  const isRtl = receiptLanguage === 'ur' || receiptLanguage === 'ar';
  
  // Dynamic translations
  const rT = (key: string, fallback: string) => getReceiptTranslation(key, receiptLanguage, fallback);

  const formattedDate = new Date(sale.createdAt).toLocaleDateString(receiptLanguage === 'en' ? [] : receiptLanguage, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = new Date(sale.createdAt).toLocaleTimeString(receiptLanguage === 'en' ? [] : receiptLanguage, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const itemsRows = sale.items
    .map(it => {
      const lineTotal = it.unitPrice * it.quantity - (it.discount || 0);
      return `
        <tr>
          <td style="padding: 3px 0; text-align: ${isRtl ? 'right' : 'left'}; vertical-align: top;">
            <div style="font-weight: 700; word-break: break-word;">${it.name}</div>
            <div style="font-size: 10px; color: #555;">
              ${it.quantity} x ${VelcoraPricingEngine.formatCurrency(it.unitPrice, currency)}
              ${it.discount ? ` (${rT('discount', 'Discount')}: -${VelcoraPricingEngine.formatCurrency(it.discount, currency)})` : ''}
            </div>
          </td>
          <td style="padding: 3px 0; text-align: ${isRtl ? 'left' : 'right'}; vertical-align: top; font-weight: 700;">
            ${VelcoraPricingEngine.formatCurrency(lineTotal, currency)}
          </td>
        </tr>
      `;
    })
    .join('');

  const paymentsRows = (sale.payments || [])
    .map(p => {
      const displayMethod = rT(p.method.toLowerCase(), p.method.replace('_', ' '));
      return `
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 2px; flex-direction: ${isRtl ? 'row-reverse' : 'row'};">
          <span style="text-transform: uppercase;">${displayMethod}${p.reference ? ` (${p.reference})` : ''}:</span>
          <span style="font-weight: 700;">${VelcoraPricingEngine.formatCurrency(p.amount, currency)}</span>
        </div>
      `;
    })
    .join('');

  const totalPaid = (sale.payments || []).reduce((sum, p) => sum + p.amount, 0);
  const changeDue = Math.max(0, totalPaid - sale.grandTotal);

  // default footer translated if not custom
  const footerMessage = business.receiptFooter && business.receiptFooter.trim() !== 'Thank you for your business! Please visit again.'
    ? business.receiptFooter
    : rT('thank_you', 'Thank you for your business! Please visit again.');

  return `
<!DOCTYPE html>
<html dir="${isRtl ? 'rtl' : 'ltr'}" lang="${receiptLanguage}">
<head>
  <meta charset="utf-8">
  <title>Receipt - ${sale.invoiceNumber}</title>
  <style>
    @page {
      size: ${widthMm} auto;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      margin: 0;
      padding: 10px;
      font-family: 'Courier New', Courier, monospace, -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 11px;
      color: #000;
      background: #fff;
      width: ${widthMm};
      max-width: 100%;
      line-height: 1.3;
      direction: ${isRtl ? 'rtl' : 'ltr'};
      text-align: ${isRtl ? 'right' : 'left'};
    }
    .text-center { text-align: center; }
    .text-right { text-align: ${isRtl ? 'left' : 'right'}; }
    .text-left { text-align: ${isRtl ? 'right' : 'left'}; }
    .bold { font-weight: bold; }
    .divider {
      border-top: 1px dashed #000;
      margin: 6px 0;
    }
    .double-divider {
      border-top: 2px solid #000;
      margin: 6px 0;
    }
    .header-title {
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .sub-header {
      font-size: 10px;
      color: #333;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    .total-row {
      font-size: 13px;
      font-weight: 900;
    }
    .barcode-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 8px 0 4px 0;
    }
    .barcode-wrap svg {
      max-width: 100%;
      height: auto;
    }
    @media screen {
      body {
        margin: 20px auto;
        box-shadow: 0 0 10px rgba(0,0,0,0.15);
        border-radius: 4px;
      }
    }
  </style>
</head>
<body>
  <div class="text-center">
    <div class="header-title">${(business?.name || '').toUpperCase()}</div>
    ${business.address ? `<div class="sub-header">${business.address}</div>` : ''}
    ${business.phone ? `<div class="sub-header">${rT('tel', 'Tel:')} ${business.phone}</div>` : ''}
    ${business.email ? `<div class="sub-header">${rT('email', 'Email:')} ${business.email}</div>` : ''}
    ${business.taxNumber ? `<div class="sub-header">${rT('tax_reg', 'Tax/VAT Reg:')} ${business.taxNumber}</div>` : ''}
  </div>

  <div class="divider"></div>

  <div style="display: flex; justify-content: space-between; font-size: 10px; flex-direction: ${isRtl ? 'row-reverse' : 'row'};">
    <span><strong>${rT('inv_label', 'INV:')}</strong> ${sale.invoiceNumber}</span>
    <span>${formattedDate} ${formattedTime}</span>
  </div>
  <div style="display: flex; justify-content: space-between; font-size: 10px; margin-top: 2px; flex-direction: ${isRtl ? 'row-reverse' : 'row'};">
    <span><strong>${rT('cashier', 'Cashier:')}</strong> ${cashierName}</span>
    <span><strong>${rT('customer', 'Customer:')}</strong> ${customerName === 'Walk-in Customer' ? rT('direct_customer', 'Walk-in Customer') : customerName}</span>
  </div>

  <div class="divider"></div>

  <table>
    <thead>
      <tr style="border-bottom: 1px dashed #000; font-size: 10px;">
        <th style="padding-bottom: 3px; text-align: ${isRtl ? 'right' : 'left'};">${rT('item_qty', 'ITEM / QTY')}</th>
        <th style="padding-bottom: 3px; text-align: ${isRtl ? 'left' : 'right'};">${rT('amount', 'AMOUNT')}</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="divider"></div>

  <div style="font-size: 11px;">
    <div style="display: flex; justify-content: space-between; flex-direction: ${isRtl ? 'row-reverse' : 'row'};">
      <span>${rT('subtotal', 'Subtotal:')}</span>
      <span>${VelcoraPricingEngine.formatCurrency(sale.subtotal, currency)}</span>
    </div>
    ${
      sale.discountTotal > 0
        ? `<div style="display: flex; justify-content: space-between; color: #111; flex-direction: ${isRtl ? 'row-reverse' : 'row'};">
            <span>${rT('discount', 'Discount:')}</span>
            <span>-${VelcoraPricingEngine.formatCurrency(sale.discountTotal, currency)}</span>
          </div>`
        : ''
    }
    ${
      sale.taxTotal > 0
        ? `<div style="display: flex; justify-content: space-between; flex-direction: ${isRtl ? 'row-reverse' : 'row'};">
            <span>${rT('tax', 'Tax / VAT:')}</span>
            <span>${VelcoraPricingEngine.formatCurrency(sale.taxTotal, currency)}</span>
          </div>`
        : ''
    }
    ${
      sale.pointsRedeemed > 0
        ? `<div style="display: flex; justify-content: space-between; flex-direction: ${isRtl ? 'row-reverse' : 'row'};">
            <span>${rT('loyalty_points_redeemed', 'Loyalty Points Redeemed:')}</span>
            <span>${sale.pointsRedeemed} pts</span>
          </div>`
        : ''
    }
    <div class="double-divider"></div>
    <div class="total-row" style="display: flex; justify-content: space-between; flex-direction: ${isRtl ? 'row-reverse' : 'row'};">
      <span>${rT('grand_total', 'GRAND TOTAL:')}</span>
      <span>${VelcoraPricingEngine.formatCurrency(sale.grandTotal, currency)}</span>
    </div>
    <div class="double-divider"></div>
  </div>

  <!-- Payments Breakdown -->
  <div style="margin-top: 4px;">
    ${paymentsRows}
    ${
      changeDue > 0
        ? `<div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 2px; font-weight: bold; flex-direction: ${isRtl ? 'row-reverse' : 'row'};">
            <span>${rT('change_due', 'Change Due:')}</span>
            <span>${VelcoraPricingEngine.formatCurrency(changeDue, currency)}</span>
          </div>`
        : ''
    }
  </div>

  ${
    sale.pointsEarned > 0
      ? `<div class="divider"></div>
         <div class="text-center" style="font-size: 10px; font-weight: bold;">
           ${rT('points_earned', '★ You earned {points} Loyalty Points on this purchase! ★').replace('{points}', String(sale.pointsEarned))}
         </div>`
      : ''
  }

  <div class="divider"></div>

  <div class="barcode-wrap" style="gap: 6px;">
    ${qrCodeSvg}
    <div style="font-size: 8px; font-weight: bold; color: #333; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">Scan to View Digital Receipt</div>
    <div style="margin-top: 4px;">${barcodeSvg}</div>
  </div>

  <div class="text-center" style="font-size: 9px; margin-top: 4px; color: #333;">
    <div>${footerMessage}</div>
    <div style="margin-top: 2px; font-size: 8px; color: #777;">${rT('powered_by', 'Powered by Velcora Intelligence ERP')}</div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generates standalone clean HTML for a full-page A4/Letter Commercial Invoice
 */
export function generateA4InvoiceHtml(options: PrintReceiptOptions): string {
  const { sale, business, currency = 'USD', cashierName = sale.cashierName || 'Cashier', customerName = sale.customerName || 'Walk-in Customer' } = options;
  const barcodeSvg = generateBarcodeSvg(sale.invoiceNumber, 240, 36);

  const origin = typeof window !== 'undefined' ? (window.location.origin + window.location.pathname) : 'https://velcora.app';
  const digitalReceiptUrl = `${origin}?b=${business.id}&s=${sale.id}`;
  const qrCodeSvg = generateQrMatrixSvg(digitalReceiptUrl, 90);

  const receiptLanguage = business.language || 'en';
  const isRtl = receiptLanguage === 'ur' || receiptLanguage === 'ar';
  
  // Dynamic translations
  const rT = (key: string, fallback: string) => getReceiptTranslation(key, receiptLanguage, fallback);

  const formattedDate = new Date(sale.createdAt).toLocaleDateString(receiptLanguage === 'en' ? [] : receiptLanguage, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const itemsRows = sale.items
    .map((it, idx) => {
      const lineTotal = it.unitPrice * it.quantity - (it.discount || 0);
      return `
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 10px; text-align: center; color: #64748B;">${idx + 1}</td>
          <td style="padding: 10px; text-align: ${isRtl ? 'right' : 'left'};">
            <div style="font-weight: 700; color: #0F172A;">${it.name}</div>
            <div style="font-size: 11px; color: #64748B; font-family: monospace;">SKU: ${it.sku}</div>
          </td>
          <td style="padding: 10px; text-align: center; font-weight: 600;">${it.quantity}</td>
          <td style="padding: 10px; text-align: ${isRtl ? 'left' : 'right'};">${VelcoraPricingEngine.formatCurrency(it.unitPrice, currency)}</td>
          <td style="padding: 10px; text-align: ${isRtl ? 'left' : 'right'}; color: ${it.discount ? '#E11D48' : '#64748B'};">
            ${it.discount ? `-${VelcoraPricingEngine.formatCurrency(it.discount, currency)}` : '—'}
          </td>
          <td style="padding: 10px; text-align: ${isRtl ? 'left' : 'right'}; font-weight: 700; color: #0F172A;">
            ${VelcoraPricingEngine.formatCurrency(lineTotal, currency)}
          </td>
        </tr>
      `;
    })
    .join('');

  const footerMessage = business.receiptFooter && business.receiptFooter.trim() !== 'Thank you for your business! Please visit again.'
    ? business.receiptFooter
    : rT('thank_you', 'Thank you for choosing us!');

  return `
<!DOCTYPE html>
<html dir="${isRtl ? 'rtl' : 'ltr'}" lang="${receiptLanguage}">
<head>
  <meta charset="utf-8">
  <title>Invoice - ${sale.invoiceNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      margin: 0;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 12px;
      color: #1E293B;
      background: #fff;
      line-height: 1.5;
      direction: ${isRtl ? 'rtl' : 'ltr'};
      text-align: ${isRtl ? 'right' : 'left'};
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #2563EB;
      padding-bottom: 20px;
      margin-bottom: 24px;
      flex-direction: ${isRtl ? 'row-reverse' : 'row'};
    }
    .logo-brand {
      font-size: 24px;
      font-weight: 900;
      color: #2563EB;
      letter-spacing: -0.5px;
      text-align: ${isRtl ? 'right' : 'left'};
    }
    .invoice-tag {
      font-size: 28px;
      font-weight: 900;
      color: #0F172A;
      text-align: ${isRtl ? 'left' : 'right'};
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }
    .meta-box {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 14px;
      text-align: ${isRtl ? 'right' : 'left'};
    }
    .meta-title {
      font-size: 11px;
      font-weight: 800;
      color: #64748B;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    th {
      background: #F1F5F9;
      padding: 10px;
      font-weight: 800;
      font-size: 11px;
      color: #475569;
      text-transform: uppercase;
      border-bottom: 2px solid #CBD5E1;
    }
    .totals-area {
      display: flex;
      justify-content: ${isRtl ? 'flex-start' : 'flex-end'};
      margin-bottom: 30px;
    }
    .totals-box {
      width: 320px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 16px;
      text-align: ${isRtl ? 'right' : 'left'};
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 12px;
      flex-direction: ${isRtl ? 'row-reverse' : 'row'};
    }
    .grand-total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 16px;
      font-weight: 900;
      color: #0F172A;
      border-top: 2px solid #2563EB;
      margin-top: 6px;
      flex-direction: ${isRtl ? 'row-reverse' : 'row'};
    }
    .footer {
      border-top: 1px solid #E2E8F0;
      padding-top: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #64748B;
      flex-direction: ${isRtl ? 'row-reverse' : 'row'};
    }
  </style>
</head>
<body>
  <div class="header">
    <div style="text-align: ${isRtl ? 'right' : 'left'};">
      <div class="logo-brand">${business.name}</div>
      <div style="color: #475569; margin-top: 4px; font-size: 12px;">${business.address || ''}</div>
      <div style="color: #64748B;">${rT('tel', 'Tel:')} ${business.phone || 'N/A'} | ${rT('email', 'Email:')} ${business.email || 'N/A'}</div>
      ${business.taxNumber ? `<div style="color: #64748B; font-weight: 600;">${rT('tax_reg', 'Tax/VAT Reg:')} ${business.taxNumber}</div>` : ''}
    </div>
    <div style="text-align: ${isRtl ? 'left' : 'right'};">
      <div class="invoice-tag">${rT('invoice', 'INVOICE')}</div>
      <div style="text-align: ${isRtl ? 'left' : 'right'}; font-weight: 700; color: #2563EB; font-family: monospace; font-size: 14px;">#${sale.invoiceNumber}</div>
      <div style="text-align: ${isRtl ? 'left' : 'right'}; color: #64748B; margin-top: 2px;">${rT('date', 'Date:')} ${formattedDate}</div>
    </div>
  </div>

  <div class="grid-2">
    <div class="meta-box">
      <div class="meta-title">${rT('billed_to', 'Billed To')}</div>
      <div style="font-weight: 800; font-size: 14px; color: #0F172A;">${customerName === 'Walk-in Customer' ? rT('direct_customer', 'Walk-in Customer') : customerName}</div>
      <div style="color: #64748B; margin-top: 2px;">${rT('account', 'Account:')} ${sale.customerId || rT('direct_customer', 'Direct Cash Customer')}</div>
      ${sale.pointsEarned ? `<div style="color: #2563EB; font-weight: 600; margin-top: 4px;">${rT('points_earned_label', 'Points Earned:')} +${sale.pointsEarned} pts</div>` : ''}
    </div>
    <div class="meta-box">
      <div class="meta-title">${rT('payment_channel', 'Payment & Channel Details')}</div>
      <div><strong>${rT('status', 'Status:')}</strong> <span style="color: #059669; font-weight: 800; text-transform: uppercase;">${sale.status}</span></div>
      <div><strong>${rT('channel', 'Channel:')}</strong> <span style="text-transform: capitalize;">${sale.channel.replace('_', ' ')}</span></div>
      <div><strong>${rT('cashier_attendant', 'Cashier / Attendant:')}</strong> ${cashierName}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 40px; text-align: center;">#</th>
        <th style="text-align: ${isRtl ? 'right' : 'left'};">${rT('item_description', 'Item Description')}</th>
        <th style="width: 70px; text-align: center;">${rT('qty', 'Qty')}</th>
        <th style="width: 100px; text-align: ${isRtl ? 'left' : 'right'};">${rT('unit_price', 'Unit Price')}</th>
        <th style="width: 90px; text-align: ${isRtl ? 'left' : 'right'};">${rT('discount', 'Discount')}</th>
        <th style="width: 110px; text-align: ${isRtl ? 'left' : 'right'};">${rT('total', 'Total')}</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="totals-area">
    <div class="totals-box">
      <div class="total-row">
        <span>${rT('subtotal', 'Subtotal:')}</span>
        <span style="font-weight: 600;">${VelcoraPricingEngine.formatCurrency(sale.subtotal, currency)}</span>
      </div>
      ${
        sale.discountTotal > 0
          ? `<div class="total-row" style="color: #E11D48;">
              <span>${rT('discount', 'Total Discount:')}</span>
              <span style="font-weight: 600;">-${VelcoraPricingEngine.formatCurrency(sale.discountTotal, currency)}</span>
            </div>`
          : ''
      }
      ${
        sale.taxTotal > 0
          ? `<div class="total-row">
              <span>${rT('tax', 'Tax / VAT:')}</span>
              <span style="font-weight: 600;">${VelcoraPricingEngine.formatCurrency(sale.taxTotal, currency)}</span>
            </div>`
          : ''
      }
      <div class="grand-total-row">
        <span>${rT('amount_due', 'Amount Due:')}</span>
        <span>${VelcoraPricingEngine.formatCurrency(sale.grandTotal, currency)}</span>
      </div>
      <div style="font-size: 11px; color: #64748B; margin-top: 8px; border-top: 1px dashed #CBD5E1; padding-top: 6px; text-align: ${isRtl ? 'right' : 'left'};">
        ${rT('payment', 'Payment:')} ${sale.payments.map(p => `${rT(p.method.toLowerCase(), p.method.replace('_', ' ')).toUpperCase()} (${VelcoraPricingEngine.formatCurrency(p.amount, currency)})`).join(', ')}
      </div>
    </div>
  </div>

  <div class="footer">
    <div style="text-align: ${isRtl ? 'right' : 'left'};">
      <div>${footerMessage}</div>
      <div style="font-size: 10px; color: #94A3B8; margin-top: 2px;">${rT('powered_by', 'Powered by Velcora Intelligence ERP')}</div>
    </div>
    <div style="display: flex; gap: 15px; align-items: center; justify-content: flex-end;">
      <div style="text-align: center;">
        ${qrCodeSvg}
        <div style="font-size: 8px; font-weight: bold; color: #64748B; text-transform: uppercase; margin-top: 2px; letter-spacing: 0.5px;">Digital Receipt</div>
      </div>
      <div>
        ${barcodeSvg}
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Triggers clean print job in an isolated hidden iframe
 */
export function executePrintJob(htmlContent: string): void {
  // Remove any previous print iframes
  const existingFrame = document.getElementById('velcora-print-iframe');
  if (existingFrame) {
    existingFrame.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'velcora-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    // Fallback to popout window if iframe document not accessible
    const popout = window.open('', '_blank', 'width=450,height=700');
    if (popout) {
      popout.document.open();
      popout.document.write(htmlContent);
      popout.document.close();
      popout.focus();
      setTimeout(() => {
        popout.print();
      }, 350);
    }
    return;
  }

  doc.open();
  doc.write(htmlContent);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
  }, 400);
}

/**
 * Direct print functions
 */
export function printThermalReceipt(options: PrintReceiptOptions): void {
  const html = generateThermalReceiptHtml(options);
  executePrintJob(html);
}

export function printStandardInvoice(options: PrintReceiptOptions): void {
  const html = generateA4InvoiceHtml(options);
  executePrintJob(html);
}

/**
 * Download ASCII formatted plain text receipt
 */
export function downloadReceiptAsText(options: PrintReceiptOptions): void {
  const { sale, business, currency = 'USD' } = options;
  const line = '==========================================\n';
  const dash = '------------------------------------------\n';

  const receiptLanguage = business.language || 'en';
  const rT = (key: string, fallback: string) => getReceiptTranslation(key, receiptLanguage, fallback);

  let txt = '';
  txt += line;
  txt += `           ${(business?.name || '').toUpperCase()}\n`;
  if (business.address) txt += `      ${business.address}\n`;
  if (business.phone) txt += `         Tel: ${business.phone}\n`;
  txt += line;
  txt += `${rT('inv_label', 'INV:')} ${sale.invoiceNumber}      ${new Date(sale.createdAt).toLocaleString(receiptLanguage)}\n`;
  txt += `${rT('customer', 'Customer:')} ${sale.customerName || 'Walk-in'}     ${rT('cashier', 'Cashier:')} ${sale.cashierName || 'POS'}\n`;
  txt += dash;
  txt += `${rT('item_qty', 'ITEM / QTY').padEnd(18)}  ${rT('unit_price', 'PRICE').padStart(8)}  ${rT('total', 'TOTAL').padStart(9)}\n`;
  txt += dash;

  sale.items.forEach(it => {
    const itemName = it.name.slice(0, 16).padEnd(16, ' ');
    const qty = String(it.quantity).padStart(4, ' ');
    const price = it.unitPrice.toFixed(2).padStart(8, ' ');
    const total = (it.unitPrice * it.quantity - (it.discount || 0)).toFixed(2).padStart(9, ' ');
    txt += `${itemName} ${qty} ${price} ${total}\n`;
  });

  txt += dash;
  txt += `${rT('subtotal', 'Subtotal:')}                     ${VelcoraPricingEngine.formatCurrency(sale.subtotal, currency)}\n`;
  if (sale.discountTotal > 0) txt += `${rT('discount', 'Discount:')}                    -${VelcoraPricingEngine.formatCurrency(sale.discountTotal, currency)}\n`;
  if (sale.taxTotal > 0) txt += `${rT('tax', 'Tax/VAT:')}                      ${VelcoraPricingEngine.formatCurrency(sale.taxTotal, currency)}\n`;
  txt += line;
  txt += `${rT('grand_total', 'GRAND TOTAL:')}                  ${VelcoraPricingEngine.formatCurrency(sale.grandTotal, currency)}\n`;
  txt += line;
  txt += `${rT('payment', 'Payment:')} ${sale.payments.map(p => `${rT(p.method.toLowerCase(), p.method.replace('_', ' ')).toUpperCase()}: ${VelcoraPricingEngine.formatCurrency(p.amount, currency)}`).join(', ')}\n`;
  
  const footerMessage = business.receiptFooter && business.receiptFooter.trim() !== 'Thank you for your business! Please visit again.'
    ? business.receiptFooter
    : rT('thank_you', 'Thank you for your business!');
  txt += `\n${footerMessage}\n`;
  txt += line;

  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `receipt-${sale.invoiceNumber}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
