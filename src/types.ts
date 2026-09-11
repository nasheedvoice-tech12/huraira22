export type UUID = string;
export type ISODateString = string;
export type CurrencyCode = 'USD' | 'PKR' | 'EUR' | 'GBP' | 'AED' | 'SAR' | 'INR' | 'CAD' | 'AUD' | 'JPY' | 'CNY';
export type LocaleCode = 'en' | 'ur' | 'ar' | 'es' | 'fr' | 'de' | 'zh' | 'hi' | 'bn' | 'fa' | 'tr';
export type ThemeMode = 'light' | 'dark';

export type IndustryType =
  | 'retail' | 'wholesale' | 'restaurant' | 'cafe' | 'grocery'
  | 'clothing' | 'footwear' | 'electronics' | 'pharmacy' | 'cosmetics'
  | 'furniture' | 'hardware' | 'mobile_shop' | 'bookstore' | 'salon'
  | 'barber' | 'repair' | 'auto_parts' | 'workshop' | 'service'
  | 'distributor' | 'manufacturer' | 'ecommerce' | 'professional' | 'custom';

export type SystemModuleKey =
  | 'dashboard' | 'business_brain'
  | 'pos'
  | 'orders' | 'sales_orders' | 'estimates' | 'invoices' | 'credit_notes' | 'delivery_notes'
  | 'products' | 'services' | 'variants' | 'barcodes'
  | 'inventory' | 'batch_tracking' | 'serial_tracking'
  | 'customers' | 'loyalty'
  | 'suppliers'
  | 'purchases'
  | 'expenses' | 'other_income' | 'commissions' | 'budgets'
  | 'employees' | 'subusers'
  | 'reports' | 'financial_reports' | 'custom_reports'
  | 'analytics'
  | 'promotions'
  | 'payments'
  | 'taxes'
  | 'notifications'
  | 'settings'
  | 'help'
  | 'online_store' | 'appointments' | 'manufacturing'
  | 'ask_velcora' | 'ai_router'
  | 'referral_hub'
  | 'super_admin';

export interface PromotionCampaign {
  id: UUID;
  businessId: UUID;
  title: string;
  code: string;
  type: 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'free_shipping';
  discountValue: number; // e.g. 15 for 15%, 10 for $10
  buyQty?: number;
  getQty?: number;
  minOrderValue?: number;
  applicableCategory?: string;
  applicableProductId?: string;
  startDate: ISODateString;
  endDate: ISODateString;
  usageLimit?: number;
  usageCount: number;
  isActive: boolean;
  notes?: string;
}

export interface TaxRateConfig {
  id: UUID;
  businessId: UUID;
  name: string;
  rate: number; // 0.08 for 8%
  isDefault: boolean;
  isEnabled: boolean;
  applicableCategories?: string[];
  taxNumber?: string;
  description?: string;
}

export interface PaymentRecord {
  id: UUID;
  businessId: UUID;
  orderId?: UUID;
  orderNumber?: string;
  customerName?: string;
  amount: number;
  method: 'cash' | 'card' | 'bank_transfer' | 'mobile_wallet' | 'store_credit' | 'split';
  status: 'completed' | 'pending' | 'refunded' | 'failed';
  referenceNumber?: string;
  notes?: string;
  cashierName?: string;
  createdAt: ISODateString;
}

export interface CustomFieldDefinition {
  id: UUID;
  entity: 'product' | 'customer' | 'supplier' | 'order' | 'employee' | 'repair_job';
  name: string;
  key: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select';
  options?: string[];
  isRequired: boolean;
  defaultValue?: any;
}

export interface ProductVariant {
  id: UUID;
  sku: string;
  barcode: string;
  attributes: Record<string, string>; // e.g. { Size: "L", Color: "Navy" }
  purchasePrice: number;
  costPrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  stock: number;
  minStock: number;
  maxStock: number;
}

export interface BatchRecord {
  id: UUID;
  productId: UUID;
  batchNumber: string;
  manufacturingDate?: ISODateString;
  expiryDate: ISODateString;
  supplierId?: UUID;
  purchaseDate: ISODateString;
  quantity: number;
  costPrice: number;
  warehouseId: string;
}

export interface Product {
  id: UUID;
  businessId: UUID;
  name: string;
  sku: string;
  barcode: string;
  qrCode?: string;
  imageUrl?: string;
  category: string;
  brand?: string;
  supplierId?: UUID;
  purchasePrice: number;
  costPrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  taxRate: number; // e.g. 0.05 for 5%
  taxInclusive: boolean;
  unit: string;
  stock: number;
  minStock: number;
  maxStock: number;
  warehouseId: string;
  location?: string;
  isService: boolean;
  enableBatchTracking: boolean;
  enableSerialTracking: boolean;
  variants: ProductVariant[];
  batches?: BatchRecord[];
  serialNumbers?: string[];
  customFieldValues: Record<string, any>;
  status: 'active' | 'archived' | 'draft';
  onlineStoreActive: boolean;
  description?: string;
  duration?: number; // Service duration in minutes
  assignedStaff?: string[]; // Assigned staff member IDs or names
  appointmentRequired?: boolean;
  availability?: string;
  commissionRate?: number;
  requirements?: string;
}

export interface CartItem {
  productId: UUID;
  variantId?: UUID;
  name: string;
  sku: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  discount: number; // Line discount amount
  discountPercent: number;
  taxRate: number;
  taxAmount: number;
  batchId?: UUID;
  serialNumber?: string;
  notes?: string;
  customFields?: Record<string, any>;
}

export interface PaymentBreakdown {
  method: 'cash' | 'card' | 'bank_transfer' | 'mobile_wallet' | 'store_credit';
  amount: number;
  reference?: string;
  paidAt: ISODateString;
}

export interface SaleReturnRecord {
  returnedAt: ISODateString;
  type: 'return' | 'exchange';
  returnedItems: { productId: UUID; variantId?: UUID; name: string; quantity: number; refundUnitPrice: number }[];
  exchangeItems?: { productId: UUID; variantId?: UUID; name: string; quantity: number; unitPrice: number }[];
  refundAmount: number;
  refundMethod: 'cash' | 'card' | 'store_credit';
  creditNoteNumber?: string;
  reason?: string;
  processedBy?: string;
}

export interface SaleTransaction {
  id: UUID;
  businessId: UUID;
  invoiceNumber: string;
  customerId?: UUID;
  customerName?: string;
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  costTotal: number;
  netProfit: number;
  payments: PaymentBreakdown[];
  balanceRemaining: number;
  status: 'completed' | 'hold' | 'returned' | 'partial' | 'cancelled';
  refundedAmount?: number;
  returnHistory?: SaleReturnRecord[];
  pointsEarned: number;
  pointsRedeemed: number;
  notes?: string;
  cashierName: string;
  createdAt: ISODateString;
  channel: 'pos' | 'online_store' | 'manual_invoice';
  deliveryStatus?: 'pending' | 'dispatched' | 'delivered';
  syncStatus?: 'synced' | 'pending';
  isOffline?: boolean;
}

export interface SaleOrder {
  id: UUID;
  businessId: UUID;
  orderNumber: string;
  customerId: UUID;
  customerName: string;
  customerPhone?: string;
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  deliveryDate?: ISODateString;
  deliveryDeadline?: ISODateString;
  advanceDeposit?: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  status: 'draft' | 'confirmed' | 'reserved' | 'processing' | 'ready' | 'completed' | 'converted';
  notes?: string;
  createdAt: ISODateString;
}

export interface Estimate {
  id: UUID;
  businessId: UUID;
  estimateNumber: string;
  customerId: UUID;
  customerName: string;
  customerEmail?: string;
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  validUntil: ISODateString;
  notes?: string;
  terms?: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'converted';
  createdAt: ISODateString;
}

export interface CreditNote {
  id: UUID;
  businessId: UUID;
  creditNoteNumber: string;
  originalInvoiceNumber: string;
  customerId: UUID;
  customerName: string;
  reason: string;
  items: { productId: UUID; name: string; quantity: number; amount: number }[];
  amount: number;
  status: 'active' | 'refunded' | 'applied';
  createdAt: ISODateString;
}

export interface DeliveryNote {
  id: UUID;
  businessId: UUID;
  deliveryNoteNumber: string;
  saleOrOrderId: string;
  customerId: UUID;
  customerName: string;
  deliveryAddress: string;
  deliveryPerson: string;
  status: 'scheduled' | 'out_for_delivery' | 'delivered' | 'failed';
  items: { name: string; quantity: number }[];
  signatureName?: string;
  deliveredAt?: ISODateString;
  notes?: string;
  createdAt: ISODateString;
}

export interface Supplier {
  id: UUID;
  businessId: UUID;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  balanceOwed: number;
  productsSuppliedCount: number;
  taxNumber?: string;
  notes?: string;
}

export interface PurchaseItem {
  productId: UUID;
  name: string;
  sku: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  totalCost: number;
  batchNumber?: string;
  expiryDate?: ISODateString;
}

export interface PurchaseOrder {
  id: UUID;
  businessId: UUID;
  poNumber: string;
  supplierId: UUID;
  supplierName: string;
  items: PurchaseItem[];
  totalAmount: number;
  amountPaid: number;
  status: 'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled';
  orderDate: ISODateString;
  expectedDate?: ISODateString;
  notes?: string;
}

export interface Customer {
  id: UUID;
  businessId: UUID;
  customerNumber?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  barcode?: string;
  qrCode?: string;
  loyaltyPoints: number;
  tier: string;
  totalSpent: number;
  ordersCount: number;
  outstandingBalance: number;
  customFields: Record<string, any>;
  notes?: string;
  lastPurchaseDate?: ISODateString;
}

export interface Workstation {
  id: string; // e.g. "WS-01" or deviceId
  deviceId?: string;
  name: string; // e.g. "Front Register 1"
  deviceName?: string;
  deviceType: 'desktop' | 'tablet' | 'mobile_pos' | 'kiosk' | 'manager_laptop';
  pairingCode: string; // 6-digit PIN
  ipAddress?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  roleId?: string;
  status: 'online' | 'offline' | 'locked';
  lastSyncAt: string;
  createdAt: string;
  allowedModules?: SystemModuleKey[];
  businessId?: string;
  registeredBy?: string;
  platform?: string;
  lastSeen?: string;
  lastActive?: string;
  isAuthorized?: boolean;
  revokedAt?: string | null;
}

export interface LoyaltyTier {
  id: UUID;
  name: string;
  minSpendRequirement: number;
  pointsMultiplier: number; // e.g. 1.5x
  badgeColor: string;
}

export interface LoyaltyRuleConfig {
  enabled: boolean;
  earningModel: 'spend_amount' | 'flat_per_order' | 'category_specific';
  spendAmountUnit: number; // e.g. 10 currency units
  pointsPerSpendUnit: number; // e.g. 1 point
  flatPointsPerOrder: number;
  pointRedemptionValue: number; // 1 point = $0.20
  minPointsForRedemption: number;
  maxRedemptionPercentagePerOrder: number; // e.g. 50%
  pointExpiryDays: number;
  bonusPointsForNewCustomer: number;
  tiers: LoyaltyTier[];
}

export interface Expense {
  id: UUID;
  businessId: UUID;
  title: string;
  category: 'Rent' | 'Salaries' | 'Utilities' | 'Marketing' | 'Transport' | 'Maintenance' | 'Taxes' | 'Software' | 'Packaging' | 'Miscellaneous';
  amount: number;
  date: ISODateString;
  paymentMethod: string;
  isRecurring: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  receiptNote?: string;
}

export interface OtherIncome {
  id: UUID;
  businessId: UUID;
  title: string;
  category: 'Commissions' | 'Service Fees' | 'Delivery Fees' | 'Rental' | 'Interest' | 'Scrap Sale' | 'Miscellaneous';
  amount: number;
  date: ISODateString;
  notes?: string;
}

export interface CommissionRule {
  id: UUID;
  businessId: UUID;
  employeeId?: UUID;
  employeeName: string;
  ruleType: 'percentage_revenue' | 'percentage_profit' | 'fixed_per_sale';
  value: number; // e.g. 5% or $10
  applicableCategory?: string;
  isActive: boolean;
}

export interface Budget {
  id: UUID;
  businessId: UUID;
  name: string;
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'project';
  startDate: ISODateString;
  endDate: ISODateString;
  startingAmount: number;
  incomeTarget: number;
  expenseLimit: number;
  categoryLimits: Record<string, number>; // e.g. { "Rent": 2000, "Marketing": 500 }
  savingsTarget: number;
  emergencyReserveTarget: number;
  debtRepaymentTarget: number;
  actualIncome?: number;
  actualSpent?: number;
  notes?: string;
}

export interface LoanPayment {
  id: UUID;
  date: ISODateString;
  amount: number;
  reference?: string;
}

export interface Loan {
  id: UUID;
  businessId: UUID;
  type: 'lent' | 'borrowed';
  partner: string; // lender or borrower name
  amount: number; // principal
  date: ISODateString;
  dueDate: ISODateString;
  interestRate: number; // in %
  repaymentSchedule: 'one-time' | 'weekly' | 'monthly' | 'custom';
  amountPaid: number;
  status: 'Pending' | 'Active' | 'Partially Paid' | 'Paid' | 'Overdue';
  notes?: string;
  payments: LoanPayment[];
}

export interface CustomerCreditPayment {
  id: UUID;
  date: ISODateString;
  amount: number;
  method: string;
}

export interface CustomerCredit {
  id: UUID;
  businessId: UUID;
  customerId: UUID;
  customerName: string;
  invoiceId: string;
  totalAmount: number;
  amountPaid: number;
  remainingBalance: number;
  dueDate: ISODateString;
  notes?: string;
  payments: CustomerCreditPayment[];
}

export interface SupplierPayablePayment {
  id: UUID;
  date: ISODateString;
  amount: number;
  method: string;
}

export interface SupplierPayable {
  id: UUID;
  businessId: UUID;
  supplierId: UUID;
  supplierName: string;
  purchaseId?: string; // po ID or custom ref
  totalAmount: number;
  amountPaid: number;
  remainingBalance: number;
  dueDate: ISODateString;
  notes?: string;
  payments: SupplierPayablePayment[];
}

export type PermissionKey =
  | 'pos:sell'
  | 'pos:apply_discount'
  | 'pos:refund'
  | 'pos:price_override'
  | 'pos:void_bill'
  | 'inventory:view'
  | 'inventory:modify'
  | 'inventory:view_costs'
  | 'inventory:adjust_stock'
  | 'purchasing:manage'
  | 'reports:sales_view'
  | 'reports:profit_view'
  | 'reports:financial_view'
  | 'reports:export'
  | 'finance:expenses'
  | 'finance:budgets'
  | 'customers:manage'
  | 'ai:access_brain'
  | 'store:manage'
  | 'employees:manage'
  | 'referrals:view'
  | 'referrals:manage'
  | 'settings:manage';

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  category: 'POS & Cashier' | 'Inventory & Stock' | 'Reports & Profit' | 'Finance & Purchasing' | 'AI & System Administration';
  description: string;
}

export interface UserRole {
  id: UUID;
  name: string;
  description: string;
  permissions: PermissionKey[];
  isCustom?: boolean;
}

export interface SubUser {
  id: UUID;
  businessId: UUID;
  staffId?: string; // Unique Staff Login ID e.g. "MGR-001", "STF-001", "STF-002"
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  pinCode: string;
  passwordHash?: string;
  passwordSalt?: string;
  allowedWorkstations?: string[];
  lastLoginAt?: string;
  status?: 'active' | 'inactive' | 'suspended';
  isActive: boolean;
  createdAt: ISODateString;
}

export interface AuditLogEntry {
  id: UUID;
  businessId: UUID;
  staffId: string;
  staffName: string;
  roleId: string;
  action:
    | 'LOGIN'
    | 'LOGOUT'
    | 'SALE_COMPLETED'
    | 'SALE_RETURN'
    | 'STOCK_ADJUSTED'
    | 'PRICE_CHANGED'
    | 'PRODUCT_CREATED'
    | 'DISCOUNT_APPLIED'
    | 'VOID_ITEM'
    | 'SUBUSER_CREATED'
    | 'SUBUSER_UPDATED'
    | 'SUBUSER_DELETED'
    | 'PERMISSION_CHANGED'
    | 'PASSWORD_RESET'
    | 'WORKSTATION_AUTHORIZED'
    | 'CASH_DRAWER_OPENED'
    | 'CONCURRENCY_LOCK_RESOLVED'
    | 'LOGIN_FAILED';
  timestamp: ISODateString;
  deviceId: string;
  deviceName: string;
  details: string;
  metadata?: Record<string, any>;
  severity?: 'info' | 'warning' | 'security';
}

export interface VelcoraUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  subscriptionTier?: 'free' | 'plus' | 'premium' | string;
  subscriptionStatus?: string;
  isSuspended?: boolean;
  ownerBusinessId?: string;
  authorizedBusinessIds: string[];
  hasCompletedOnboarding?: boolean;
  aiTokensBalance?: number;
  availableCredits?: number;
  includedCredits?: number;
  purchasedCredits?: number;
  usedCredits?: number;
  points?: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface BusinessProfile {
  id: UUID;
  name: string;
  ownerUid?: string;
  subscriptionTier?: 'free' | 'plus' | 'premium';
  memberUids?: string[];
  legalName?: string;
  industry: IndustryType;
  businessModel?: 'product' | 'service' | 'hybrid';
  industryCategory?: 'retail' | 'beauty' | 'healthcare' | 'food' | 'automotive' | 'education' | 'professional' | 'other';
  primaryColor?: string;
  country: string;
  currency: CurrencyCode;
  currencySymbol: string;
  language: LocaleCode;
  taxRateDefault: number;
  taxInclusive: boolean;
  taxNumber?: string;
  phone: string;
  email: string;
  address: string;
  logoUrl?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  enabledModules: SystemModuleKey[];
  customFields: CustomFieldDefinition[];
  createdAt: ISODateString;
  updatedAt?: ISODateString;
}

export interface BusinessHealthEvaluation {
  hasData: boolean;
  overallScore: number | null;
  breakdown: {
    salesHealth: 'POOR' | 'WARNING' | 'GOOD' | 'EXCELLENT' | 'NO_DATA';
    profitHealth: 'POOR' | 'WARNING' | 'GOOD' | 'EXCELLENT' | 'NO_DATA';
    inventoryHealth: 'POOR' | 'WARNING' | 'GOOD' | 'EXCELLENT' | 'NO_DATA';
    expenseHealth: 'POOR' | 'WARNING' | 'GOOD' | 'EXCELLENT' | 'NO_DATA';
    customerRetention: 'POOR' | 'WARNING' | 'GOOD' | 'EXCELLENT' | 'NO_DATA';
  };
  problems: {
    id: string;
    title: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    what: string;
    why: string;
    impact: string;
    actionRecommendation: string;
  }[];
  opportunities: {
    id: string;
    title: string;
    potentialBenefit: string;
    confidenceScore: number;
    recommendedAction: string;
  }[];
}

export interface BusinessGoal {
  id: UUID;
  businessId: UUID;
  title: string;
  metric: 'revenue' | 'net_profit' | 'customer_count' | 'dead_stock_reduction' | 'online_orders';
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: ISODateString;
  status: 'on_track' | 'at_risk' | 'achieved' | 'behind';
}

export interface SmartAlert {
  id: UUID;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  timestamp: ISODateString;
  read: boolean;
  actionRoute?: string;
}

export interface AIModelDefinition {
  id: string;
  name: string;
  provider: 'Velcora AI' | 'Velcora Neural' | 'Velcora Core' | 'Custom';
  category: 'Reasoning' | 'Fast & Direct' | 'Creative Writing' | 'Multimodal Vision' | 'Code & Math';
  latencyMs: number;
  costPer1kTokens: number;
  contextWindow: string;
  status: 'active' | 'standby' | 'fallback';
}

export interface BusinessTask {
  id: UUID;
  businessId: UUID;
  title: string;
  description?: string;
  category: 'inventory' | 'sales' | 'finance' | 'marketing' | 'customer' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo?: string;
  dueDate?: ISODateString;
  createdAt: ISODateString;
  completedAt?: ISODateString;
  source?: 'ai_agent' | 'user' | 'automation';
  metadata?: Record<string, any>;
}

export interface AiActionProposal {
  id: string;
  actionType: 'CREATE_TASK' | 'CREATE_GOAL' | 'CREATE_EXPENSE' | 'CREATE_PURCHASE_ORDER' | 'GENERATE_REPORT' | 'ADJUST_STOCK' | 'OPEN_MODULE';
  label: string;
  description: string;
  requiresConfirmation: boolean;
  payload: any;
  status: 'pending' | 'executed' | 'dismissed';
}

export interface OnlineStoreOrder {
  id: UUID;
  businessId: UUID;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: { productId: UUID; variantId?: UUID; name: string; quantity: number; unitPrice: number }[];
  totalAmount: number;
  paymentMethod: 'cash_on_delivery' | 'online_card' | 'bank_transfer';
  paymentStatus: 'unpaid' | 'paid';
  deliveryStatus: 'received' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled';
  createdAt: ISODateString;
  notes?: string;
}

// ----------------------------------------------------
// VELCORA REFERRAL, ATTRIBUTION & COMMISSION TYPES
// ----------------------------------------------------

export type ReferralPartnerStatus = 'NOT_ELIGIBLE' | 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED';

export interface ReferralPartner {
  partnerId: string;
  id?: string;
  userId: string;
  userEmail: string;
  userName: string;
  status: ReferralPartnerStatus;
  referralCode?: string;
  payoutMethod?: 'bank_transfer' | 'stripe_connect' | 'paypal' | 'manual';
  payoutDetails?: string;
  applicationNotes?: string;
  adminNotes?: string;
  createdAt: ISODateString;
  approvedAt?: ISODateString;
  suspendedAt?: ISODateString;
  revokedAt?: ISODateString;
}

export interface ReferralRecord {
  referralId: string;
  referralPartnerId: string;
  referralCode: string; // VEL + 6 digits (e.g., VEL453821)
  status: 'ACTIVE' | 'REVOKED' | 'INACTIVE';
  createdAt: ISODateString;
}

export type AttributionSource = 'url_param' | 'checkout_input' | 'direct';
export type AttributionStatus = 'ATTRIBUTED' | 'QUALIFIED' | 'EXPIRED' | 'DISQUALIFIED';

export interface ReferralAttribution {
  attributionId: string;
  referralId: string;
  referralCode: string;
  referredUserId: string;
  referredUserEmail?: string;
  source: AttributionSource;
  ipHash?: string;
  status: AttributionStatus;
  createdAt: ISODateString;
  qualifiedAt?: ISODateString;
}

export type CommissionStatus = 'PENDING' | 'APPROVED' | 'AVAILABLE' | 'PAID' | 'REVERSED';

export interface CommissionRecord {
  commissionId: string;
  referralId: string;
  referralPartnerId: string;
  attributionId: string;
  subscriptionPlan: string;
  paymentEventId?: string;
  amount: number;
  currency: string;
  status: CommissionStatus;
  createdAt: ISODateString;
  approvedAt?: ISODateString;
  availableAt?: ISODateString;
  paidAt?: ISODateString;
  reversedAt?: ISODateString;
  notes?: string;
}

export interface PaymentEvent {
  eventId: string;
  provider: 'stripe' | 'paddle' | 'razorpay' | 'manual' | 'simulator';
  externalEventId: string;
  transactionReference: string;
  amount: number;
  currency: string;
  eventType: 'payment_intent.succeeded' | 'charge.refunded' | 'charge.dispute.created' | 'subscription.created';
  subscriptionPlan: string;
  userId: string;
  referralCode?: string;
  receivedAt: ISODateString;
  processedAt: ISODateString;
  signatureVerified: boolean;
}

export interface ReferralConfig {
  programEnabled: boolean;
  commissionAmount: number; // e.g. 3 ($3 per qualifying subscription)
  defaultCommissionAmount?: number;
  currency: string;
  eligiblePlans: string[];
  verificationPeriodDays: number; // e.g. 14 or 30 days
  verificationHoldDays?: number;
  minPayoutAmount: number; // e.g. $20
  minimumPayoutAmount?: number;
  selfReferralProtection: boolean;
  preventSelfReferrals?: boolean;
  allowCustomerDiscount: boolean;
  payoutIntegrationConfigured: boolean;
}

export interface ReferralActivityItem {
  id: string;
  description: string;
  reward: number;
  currency: string;
  status: CommissionStatus;
  date: ISODateString;
  eventDate?: string;
  referenceHash?: string;
  planName?: string;
  commissionAmount?: number;
  holdReleaseDate?: string;
}

export interface ReferralPartnerStats {
  partnerId: string;
  referralCode: string;
  referralLink: string;
  status: ReferralPartnerStatus;
  referralRateAmount?: number;
  successfulReferrals: number;
  pendingRewards: number;
  availableRewards: number;
  totalEarned: number;
  totalPaid: number;
  currency: string;
  metrics?: {
    totalAttributed: number;
    totalQualified: number;
    pendingCommissions: number;
    availableCommissions: number;
    totalPaidCommissions: number;
    conversionRate: number;
    totalReferrals?: number;
    totalCommissionEarned?: number;
    pendingCommissionAmount?: number;
    availableCommissionAmount?: number;
  };
  recentActivity: ReferralActivityItem[];
}

export interface ReferralAuditLog {
  logId: string;
  actorId: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  timestamp: ISODateString;
  ipAddress?: string;
}

// ----------------------------------------------------
// VELCORA MASTER PAYMENT, SUBSCRIPTION & TOKEN TYPES
// ----------------------------------------------------

export type VelcoraSubscriptionTier = 'free' | 'pro' | 'pro_max' | 'starter' | 'professional' | 'enterprise' | string;

export interface PlanFeatureAccess {
  beta_store: boolean;
  ai_chat: boolean;
  ai_brain: boolean;
  advanced_analytics: boolean;
  multi_terminal: boolean;
  custom_branding: boolean;
  bulk_import_export: boolean;
  loyalty_system: boolean;
  accounting_tax: boolean;
  purchase_orders: boolean;
  discounts_promotions: boolean;
  barcode_generator: boolean;
  pos_refunds_credit_notes: boolean;
  role_permissions: boolean;
  api_access: boolean;
  priority_support: boolean;
  [key: string]: boolean;
}

export interface PlanResourceLimits {
  maxProducts: number;
  maxStaff: number;
  maxWorkstations: number;
  monthlyAiCredits: number;
  maxCustomers: number;
  maxSuppliers: number;
  maxWarehouses: number;
  [key: string]: number;
}

export interface SubscriptionPlanConfig {
  id: string; // e.g. 'tier_starter', 'tier_professional', 'tier_enterprise'
  tier: VelcoraSubscriptionTier;
  name: string;
  tagline: string;
  monthlyPriceUSD: number;
  annualPriceUSD: number; // Discounted annual rate
  currencyPricing: Record<string, { monthly: number; annual: number }>; // e.g. PKR: { monthly: 4500, annual: 45000 }
  tokensIncludedMonthly: number; // AI token quota granted on renewal
  maxWorkstations: number;
  maxSubusers: number;
  maxProducts: number;
  features: string[];
  featureAccess?: Partial<PlanFeatureAccess>;
  resourceLimits?: Partial<PlanResourceLimits>;
  isPopular?: boolean;
  isActive: boolean;
  commissionEligible: boolean; // Always TRUE for subscriptions
}

export interface TokenPackageConfig {
  id: string; // e.g. 'token_pack_5usd', 'token_pack_20usd', 'token_pack_60usd'
  name: string;
  tokens: number;
  bonusTokens: number;
  priceUSD: number;
  currencyPricing: Record<string, number>; // e.g. PKR: 1400
  badge?: string;
  isPopular?: boolean;
  isActive: boolean;
  commissionEligible: false; // STRICT RULE: Always FALSE (ZERO commission)
  internalAllowanceUSD?: number; // Server-side internal API usage allowance (never shown to customer)
}

export type MasterTransactionType = 'SUBSCRIPTION' | 'TOKEN_PURCHASE';
export type MasterPaymentStatus = 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'expired' | 'refunded' | 'disputed';
export type PaymentGatewayProvider = 
  | 'stripe' 
  | 'jazzcash' 
  | 'easypaisa' 
  | 'raast' 
  | 'payoneer' 
  | 'paypal' 
  | 'wise' 
  | 'safepay'
  | 'bank_transfer'
  | 'simulator';

export interface MasterPaymentTransaction {
  transactionId: string;
  id?: string;
  userId: string;
  user_id?: string;
  userEmail: string;
  userName?: string;
  businessId?: string;
  businessName?: string;
  transactionType: MasterTransactionType;
  planId?: string;
  packageId?: string;
  productId?: string;
  orderId?: string;
  providerPaymentId?: string;
  tokensPurchased?: number;
  amount: number;
  currency: string;
  amountUSD: number;
  status: MasterPaymentStatus;
  provider: PaymentGatewayProvider;
  externalTransactionId: string;
  paymentMethodDetails?: string;
  signatureVerified: boolean;
  idempotencyKey: string;
  referralCode?: string;
  commissionEligible: boolean; // TRUE for SUBSCRIPTION, FALSE for TOKEN_PURCHASE
  commissionRecordId?: string;
  createdAt: ISODateString;
  completedAt?: ISODateString;
  paidAt?: ISODateString;
  updatedAt?: ISODateString;
  refundedAt?: ISODateString;
  refundReason?: string;
  metadata?: Record<string, any>;
}

export interface SubscriptionRecord {
  subscriptionId: string;
  userId: string;
  userEmail: string;
  businessId?: string;
  planId: string;
  planName: string;
  tier: VelcoraSubscriptionTier;
  billingInterval: 'monthly' | 'annual';
  amount: number;
  currency: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';
  currentPeriodStart: ISODateString;
  currentPeriodEnd: ISODateString;
  autoRenew: boolean;
  cancelAtPeriodEnd: boolean;
  canceledAt?: ISODateString;
  cancelReason?: string;
  tokensIncludedMonthly: number;
  tokensGrantedThisPeriod: boolean;
  tokensRemaining?: number;
  maxWorkstations?: number;
  paymentProvider: PaymentGatewayProvider;
  externalSubscriptionId?: string;
  lastPaymentTransactionId?: string;
  referralCodeUsed?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type GlobalPayoutProviderType = 
  | 'jazzcash' 
  | 'easypaisa' 
  | 'raast' 
  | 'bank_iban' 
  | 'payoneer' 
  | 'stripe_connect' 
  | 'paypal' 
  | 'wise';

export interface GlobalPayoutAccount {
  id: string;
  partnerId: string;
  userId: string;
  countryCode: string; // e.g. 'PK', 'US', 'GB', 'AE', 'SA', 'DE'
  provider: GlobalPayoutProviderType;
  accountTitle: string;
  accountNumberOrIban: string;
  bankName?: string;
  branchCode?: string;
  swiftBic?: string;
  email?: string;
  isDefault: boolean;
  isVerified: boolean;
  createdAt: ISODateString;
}

export type PayoutRequestStatus = 'pending' | 'processing' | 'approved' | 'completed' | 'failed' | 'canceled';

export interface PayoutRequest {
  payoutId: string;
  partnerId: string;
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  currency: string;
  netAmount: number;
  feeAmount: number;
  destinationAccount: GlobalPayoutAccount;
  status: PayoutRequestStatus;
  requestedAt: ISODateString;
  processedAt?: ISODateString;
  completedAt?: ISODateString;
  failureReason?: string;
  transactionReference?: string;
  batchId?: string;
  adminNotes?: string;
  includedCommissionIds: string[];
}

export interface SuperAdminConfig {
  systemKillSwitch: boolean;
  maintenanceMode: boolean;
  allowTokenPurchases: boolean;
  allowSubscriptions: boolean;
  allowReferralPayouts: boolean;
  defaultTrialDays: number;
  defaultCommissionRatePercent: number; // e.g. 20% on subscriptions
  defaultFixedCommissionUSD: number; // e.g. $10 on Starter, $25 on Pro, $50 on Enterprise
  commissionMode: 'PERCENTAGE' | 'FIXED_PER_TIER';
  tierFixedCommissionUSD: Record<string, number>; // { tier_starter: 10, tier_professional: 25, tier_enterprise: 60 }
  tokenPurchaseCommissionPercent: 0; // STRICT: ALWAYS 0%
  verificationHoldDays: number; // e.g. 14 days
  minimumPayoutAmountUSD: number; // e.g. $25
  countryMinPayouts: Record<string, { currency: string; minAmount: number }>; // e.g. PK: { currency: 'PKR', minAmount: 5000 }
  exchangeRates: Record<string, number>; // relative to 1 USD: e.g. PKR: 278, EUR: 0.92, GBP: 0.79, AED: 3.67, SAR: 3.75
  supportedPayoutCountries: Array<{
    code: string;
    name: string;
    currency: string;
    allowedProviders: GlobalPayoutProviderType[];
  }>;
  webhookSecretKeys: Record<string, string>;
  lastUpdatedBy?: string;
  lastUpdatedAt?: ISODateString;
}

export interface SuperAdminAuditLog {
  logId: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetCategory: 'USER' | 'SUBSCRIPTION' | 'TOKEN' | 'PAYMENT' | 'REFERRAL' | 'PAYOUT' | 'CONFIG' | 'SECURITY';
  targetId: string;
  details: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  timestamp: ISODateString;
}

export interface KeyboardShortcut {
  id: string;
  label: string;
  description: string;
  key: string;         // e.g. "F2", "v", "Escape"
  ctrlKey?: boolean;   // modifier
  altKey?: boolean;    // modifier
  shiftKey?: boolean;  // modifier
}



