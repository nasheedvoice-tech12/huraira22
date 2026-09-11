import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, getDocs, getDoc, addDoc, query, where, arrayUnion, increment 
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType, logoutUser, syncUserProfileAndBusiness, cleanObjectForFirestore, signInWithEmail, signUpWithEmail, signInWithGoogle, sendPhoneOtp, verifyPhoneOtp } from '../lib/firebase';
import {
  BusinessProfile, Product, Customer, Supplier, SaleTransaction, SaleReturnRecord,
  Expense, OtherIncome, BusinessGoal, LoyaltyRuleConfig, AIModelDefinition,
  SubUser, CartItem, PaymentBreakdown, SmartAlert, SystemModuleKey,
  LocaleCode, CurrencyCode, OnlineStoreOrder, PurchaseOrder,
  Estimate, CreditNote, DeliveryNote, SaleOrder, CommissionRule, Budget,
  Loan, LoanPayment, CustomerCredit, CustomerCreditPayment, SupplierPayable, SupplierPayablePayment,
  UserRole, PermissionKey, IndustryType, Workstation, VelcoraUserProfile,
  BusinessTask, AiActionProposal, PromotionCampaign, TaxRateConfig, PaymentRecord,
  ReferralPartner, ReferralConfig, ReferralPartnerStats, ReferralPartnerStatus, CommissionStatus,
  SubscriptionPlanConfig, TokenPackageConfig, MasterPaymentTransaction, SubscriptionRecord,
  GlobalPayoutAccount, PayoutRequest, SuperAdminConfig, SuperAdminAuditLog, VelcoraSubscriptionTier,
  PaymentGatewayProvider, GlobalPayoutProviderType, KeyboardShortcut
} from '../types';
import { syncAndRegisterDevice, getOrCreateDeviceId } from '../lib/deviceManager';
import {
  INITIAL_BUSINESSES, INITIAL_PRODUCTS, INITIAL_CUSTOMERS,
  INITIAL_SUPPLIERS, INITIAL_SALES, INITIAL_EXPENSES,
  INITIAL_OTHER_INCOME, INITIAL_BUSINESS_GOALS, DEFAULT_LOYALTY_CONFIG,
  DEFAULT_AI_MODELS, DEFAULT_SUBUSERS, SYSTEM_ROLES, PERMISSION_DEFINITIONS,
  DEFAULT_WORKSTATIONS, INITIAL_PROMOTIONS, INITIAL_TAX_RATES, INITIAL_PAYMENTS
} from '../data/mockInitialData';
import { DEFAULT_SUBSCRIPTION_PLANS, DEFAULT_TOKEN_PACKAGES } from '../data/paymentPlans';
import { VelcoraPricingEngine } from '../utils/pricingEngine';
import { VelcoraLoyaltyEngine } from '../utils/loyaltyEngine';
import { VelcoraBusinessBrainEngine } from '../utils/brainEngine';
import { t } from '../utils/translations';
import { VELCORA_COLOR_PALETTES } from '../constants/themeColors';
import { getApiUrl } from '../lib/apiConfig';
import { logSystemActivity } from '../lib/analyticsEngine';

interface VelcoraContextType {
  // Firebase Auth & User Profile & Session Persistence
  authUser: User | null;
  userProfile: VelcoraUserProfile | null;
  authLoading: boolean;
  authError: string | null;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  authSessionType: 'owner' | 'staff' | 'demo' | null;
  loginAsOwner: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signupAsOwner: (email: string, pass: string, name?: string, referralCode?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  sendPhoneOtpCode: (phone: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  loginWithPhoneOtpCode: (otpCode: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  loginAsStaff: (staffId: string, password?: string, pinCode?: string) => Promise<{ success: boolean; staff?: SubUser; error?: string }>;
  quickLoginAsDemo: (role: 'owner' | 'manager' | 'cashier' | 'inventory' | 'accountant') => Promise<void>;
  logout: () => Promise<void>;
  setHasCompletedOnboarding: (completed: boolean) => void;

  // Business Profile & Multi-tenant Switcher
  businesses: BusinessProfile[];
  allBusinesses: BusinessProfile[];
  activeBusiness: BusinessProfile;
  setActiveBusinessId: (id: string) => void;
  updateActiveBusiness: (patch: Partial<BusinessProfile>) => void;
  updateBusinessProfile: (patch: Partial<BusinessProfile>) => void;
  addNewBusiness: (biz: BusinessProfile) => void;

  // View state
  activeMode: 'pos' | 'business';
  setActiveMode: (mode: 'pos' | 'business') => void;
  currentModule: SystemModuleKey | 'settings' | 'subusers';
  setCurrentModule: (mod: SystemModuleKey | 'settings' | 'subusers') => void;
currency: CurrencyCode;
  setCurrency: (cur: CurrencyCode) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;

  // Subuser & Granular RBAC Permissions
  activeUser: SubUser;
  activeSubuser: SubUser;
  setActiveUser: (user: SubUser) => void;
  subusers: SubUser[];
  addSubuser: (user: SubUser) => void;
  updateSubuser: (id: string, patch: Partial<SubUser>) => void;
  deleteSubuser: (id: string) => void;
  workstations: Workstation[];
  addWorkstation: (ws: Workstation) => void;
  updateWorkstation: (id: string, patch: Partial<Workstation>) => void;
  deleteWorkstation: (id: string) => void;
  authorizeWorkstation: (id: string) => void;
  revokeWorkstation: (id: string) => void;
  isOffline: boolean;
  offlineSalesQueue: SaleTransaction[];
  syncOfflineSales: () => Promise<{ success: boolean; syncedCount: number; error?: string }>;
  restoreBackupData: (backupData: any) => Promise<{ success: boolean; count: number; error?: string }>;
  roles: UserRole[];
  addRole: (role: UserRole) => void;
  updateRole: (id: string, patch: Partial<UserRole>) => void;
  deleteRole: (id: string) => void;
  hasPermission: (permission: PermissionKey) => boolean;

  // Interactive Onboarding Flow
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
  completeOnboarding: (config: {
    businessName: string;
    industry: IndustryType;
    businessModel?: 'product' | 'service' | 'hybrid';
    industryCategory?: 'retail' | 'beauty' | 'healthcare' | 'food' | 'automotive' | 'education' | 'professional' | 'other';
    primaryColor?: string;
    country?: string;
    currency: CurrencyCode;
    language: LocaleCode;
    enabledModules: SystemModuleKey[];
    taxRate: number;
    taxInclusive: boolean;
    initialRoleName?: string;
  }) => void;

  // Floating AI Assistant
  isAiAssistantOpen: boolean;
  setIsAiAssistantOpen: (open: boolean) => void;

  // Products & Inventory
  products: Product[];
  addProduct: (product: Product) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  adjustStock: (productId: string, delta: number, reason?: string) => void;

  // Customers & Loyalty
  customers: Customer[];
  addCustomer: (cust: Customer) => void;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  loyaltyConfig: LoyaltyRuleConfig;
  setLoyaltyConfig: (cfg: LoyaltyRuleConfig) => void;
  updateLoyaltyConfig: (cfg: Partial<LoyaltyRuleConfig>) => void;

  // Suppliers & Purchasing
  suppliers: Supplier[];
  addSupplier: (sup: Supplier) => void;
  updateSupplier: (id: string, patch: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  purchaseOrders: PurchaseOrder[];
  addPurchaseOrder: (po: PurchaseOrder) => void;
  receivePurchaseOrder: (poId: string) => void;

  // Sales & Transactions
  sales: SaleTransaction[];
  salesHistory: SaleTransaction[];
  saleOrders: SaleOrder[];
  estimates: Estimate[];
  creditNotes: CreditNote[];
  deliveryNotes: DeliveryNote[];
  addSaleOrder: (so: SaleOrder) => void;
  addNewSaleOrder: (so: SaleOrder) => void;
  convertEstimateToSale: (estimateId: string) => void;
  addEstimate: (est: Estimate) => void;
  addCreditNote: (cn: CreditNote) => void;
  addDeliveryNote: (dn: DeliveryNote) => void;
  processSaleReturnOrExchange: (params: {
    saleId: string;
    type: 'return' | 'exchange';
    returnedItems: { productId: string; variantId?: string; name: string; quantity: number; refundUnitPrice: number }[];
    exchangeItems?: { productId: string; variantId?: string; name: string; quantity: number; unitPrice: number }[];
    refundMethod: 'cash' | 'card' | 'store_credit';
    reason?: string;
  }) => Promise<{ success: boolean; creditNote?: CreditNote; message?: string }>;

  // Finance & Budgets
  expenses: Expense[];
  addExpense: (exp: Expense) => void;
  updateExpense: (id: string, patch: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  otherIncomes: OtherIncome[];
  addOtherIncome: (oi: OtherIncome) => void;
  updateOtherIncome: (id: string, patch: Partial<OtherIncome>) => void;
  deleteOtherIncome: (id: string) => void;
  commissions: CommissionRule[];
  budgets: Budget[];
  addBudget: (b: Budget) => void;
  updateBudget: (id: string, patch: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;
  loans: Loan[];
  addLoan: (l: Loan) => void;
  updateLoan: (id: string, patch: Partial<Loan>) => void;
  deleteLoan: (id: string) => void;
  addLoanPayment: (loanId: string, payment: Omit<LoanPayment, 'id'>) => void;
  customerCredits: CustomerCredit[];
  addCustomerCredit: (cc: CustomerCredit) => void;
  recordCustomerCreditPayment: (creditId: string, payment: Omit<CustomerCreditPayment, 'id'>) => void;
  supplierPayables: SupplierPayable[];
  addSupplierPayable: (sp: SupplierPayable) => void;
  recordSupplierPayablePayment: (payableId: string, payment: Omit<SupplierPayablePayment, 'id'>) => void;

  // Promotions & Discounts
  promotions: PromotionCampaign[];
  addPromotion: (promo: PromotionCampaign) => void;
  updatePromotion: (id: string, patch: Partial<PromotionCampaign>) => void;
  deletePromotion: (id: string) => void;

  // Tax Rates Configuration
  taxRates: TaxRateConfig[];
  addTaxRate: (tax: TaxRateConfig) => void;
  updateTaxRate: (id: string, patch: Partial<TaxRateConfig>) => void;
  deleteTaxRate: (id: string) => void;

  // Payments History & Transactions
  paymentsList: PaymentRecord[];
  addPaymentRecord: (pay: PaymentRecord) => void;

  // POS Cart State
  cart: CartItem[];
  addToCart: (product: Product, variantId?: string, qty?: number) => void;
  removeFromCart: (productId: string, variantId?: string) => void;
  updateCartItemQty: (productId: string, variantId: string | undefined, qty: number) => void;
  updateCartItemDiscount: (productId: string, variantId: string | undefined, discountAmount: number) => void;
  clearCart: () => void;
  selectedCustomerId: string | null;
  setSelectedCustomerId: (id: string | null) => void;
  selectedCustomer: Customer | null;
  redeemPoints: number;
  setRedeemPoints: (pts: number) => void;
  heldCarts: { id: string; name: string; items: CartItem[]; customerId?: string; createdAt: string }[];
  holdCurrentCart: (label?: string) => void;
  resumeHeldCart: (id: string) => void;
  deleteHeldCart: (id: string) => void;

  // Checkout Execution
  completeSale: (payments: PaymentBreakdown[], notes?: string) => SaleTransaction;

  // Business Brain & Diagnostics & Tasks
  brainMetrics: ReturnType<typeof VelcoraBusinessBrainEngine.computeDiagnostics>['metrics'];
  brainHealth: ReturnType<typeof VelcoraBusinessBrainEngine.computeDiagnostics>['health'];
  businessGoals: BusinessGoal[];
  addBusinessGoal: (goal: BusinessGoal) => void;
  updateBusinessGoal: (id: string, patch: Partial<BusinessGoal>) => void;
  tasks: BusinessTask[];
  addTask: (task: BusinessTask) => void;
  updateTask: (id: string, patch: Partial<BusinessTask>) => void;
  deleteTask: (id: string) => void;
  executeAiAction: (action: AiActionProposal | { type?: string; actionType?: string; payload: any }) => { success: boolean; message: string; data?: any };
  smartAlerts: SmartAlert[];
  dismissAlert: (id: string) => void;

  // AI Router & Models
  aiModels: AIModelDefinition[];
  activeModelId: string;
  setActiveModelId: (id: string) => void;
  aiUsageStats: { requestsCount: number; tokensConsumed: number; totalCost: number };

  // Online Store Beta Sync
  onlineOrders: OnlineStoreOrder[];
  submitOnlineStoreOrder: (order: Omit<OnlineStoreOrder, 'id' | 'businessId' | 'orderNumber' | 'createdAt'>) => OnlineStoreOrder;

  // Unified Velcora Shared Intelligence Context
  sharedIntelligenceContext: {
    lastRecommendedProduct: {
      id: string;
      name: string;
      category: string;
      price: number;
      stock: number;
      unitsSold: number;
      description?: string;
    } | null;
    lastPromptOrCreativeRequest: string | null;
    bestSellingProduct: {
      id: string;
      name: string;
      category: string;
      price: number;
      unitsSold: number;
    } | null;
    pastRecommendationsOutcomes: Array<{
      recommendationId: string;
      productName: string;
      category: string;
      date: string;
      outcome: 'increased' | 'decreased' | 'flat' | 'pending';
      unitsSoldBefore: number;
      unitsSoldAfter?: number;
    }>;
  };
  setSharedIntelligenceContext: React.Dispatch<React.SetStateAction<{
    lastRecommendedProduct: {
      id: string;
      name: string;
      category: string;
      price: number;
      stock: number;
      unitsSold: number;
      description?: string;
    } | null;
    lastPromptOrCreativeRequest: string | null;
    bestSellingProduct: {
      id: string;
      name: string;
      category: string;
      price: number;
      unitsSold: number;
    } | null;
    pastRecommendationsOutcomes: Array<{
      recommendationId: string;
      productName: string;
      category: string;
      date: string;
      outcome: 'increased' | 'decreased' | 'flat' | 'pending';
      unitsSoldBefore: number;
      unitsSoldAfter?: number;
    }>;
  }>>;
  recordRecommendationOutcome: (recommendationId: string, productName: string, category: string, outcome: 'increased' | 'decreased' | 'flat' | 'pending') => void;

  // Velcora Referral, Attribution & Commission Engine
  referralConfig: ReferralConfig | null;
  activeReferralCode: string | null;
  isReferralCodeApplied: boolean;
  partnerProfile: ReferralPartner | null;
  partnerDashboard: ReferralPartnerStats | null;
  adminReferralOverview: any | null;
  referralLoading: boolean;
  referralError: string | null;
  validateReferralCode: (code: string) => Promise<{ valid: boolean; code?: string; message?: string }>;
  applyReferralCode: (code: string) => Promise<{ valid: boolean; message: string }>;
  removeReferralCode: () => void;
  applyToBecomePartner: (data: { payoutMethod?: string; payoutDetails?: string; applicationNotes?: string }) => Promise<{ success: boolean; message: string }>;
  fetchPartnerStatus: () => Promise<void>;
  fetchPartnerDashboard: () => Promise<void>;
  fetchAdminReferralOverview: () => Promise<void>;
  updatePartnerStatusByAdmin: (partnerId: string, status: ReferralPartnerStatus, notes?: string) => Promise<{ success: boolean; message: string }>;
  transitionCommissionByAdmin: (commissionId: string, status: CommissionStatus, notes?: string) => Promise<{ success: boolean; message: string }>;
  updateReferralConfigByAdmin: (patch: Partial<ReferralConfig>) => Promise<{ success: boolean; message: string }>;
  simulateRefundReversal: (transactionReference: string, reason?: string) => Promise<{ success: boolean; message: string }>;
  processSubscriptionPaymentWithReferral: (planName: string, amount: number, transactionId: string) => Promise<{ success: boolean; message: string }>;
  runReferralSecurityTest: () => Promise<{ success: boolean; allPassed: boolean; results: any[] }>;

  // Master Payment, Subscription, Token & Global Payout System
  subscriptionPlans: SubscriptionPlanConfig[];
  tokenPackages: TokenPackageConfig[];
  activeSubscription: SubscriptionRecord | null;
  userTransactions: MasterPaymentTransaction[];
  payoutAccounts: GlobalPayoutAccount[];
  payoutRequests: PayoutRequest[];
  superAdminTelemetry: any | null;
  superAdminConfig: SuperAdminConfig | null;
  paymentLoading: boolean;
  paymentError: string | null;
  isCheckoutModalOpen: boolean;
  checkoutInitialTab: 'subscriptions' | 'tokens';
  checkoutSelectedPlanId: string | null;
  checkoutSelectedPackageId: string | null;
  openCheckoutModal: (initialTab?: 'subscriptions' | 'tokens', preselectId?: string) => void;
  closeCheckoutModal: () => void;
  fetchPaymentConfig: () => Promise<void>;
  fetchUserSubscription: () => Promise<void>;
  initiateCheckoutSession: (params: {
    itemType: 'SUBSCRIPTION' | 'TOKEN_PURCHASE';
    itemId: string;
    billingInterval?: 'monthly' | 'annual';
    currency?: string;
    provider?: PaymentGatewayProvider;
    referralCode?: string;
  }) => Promise<{ success: boolean; session?: any; error?: string }>;
  confirmOrderPayment: (params: {
    transactionType: 'SUBSCRIPTION' | 'TOKEN_PURCHASE';
    planId?: string;
    packageId?: string;
    billingInterval?: 'monthly' | 'annual';
    amount: number;
    currency: string;
    provider: PaymentGatewayProvider;
    externalTransactionId?: string;
    paymentMethodDetails?: string;
    referralCode?: string;
  }) => Promise<{ success: boolean; transaction?: MasterPaymentTransaction; subscription?: SubscriptionRecord; tokensCredited?: number; error?: string }>;
  cancelUserSubscription: (cancelImmediately?: boolean, reason?: string) => Promise<{ success: boolean; message: string }>;
  fetchPayoutAccounts: () => Promise<void>;
  addPayoutAccount: (account: Omit<GlobalPayoutAccount, 'id' | 'createdAt'>) => Promise<{ success: boolean; account?: GlobalPayoutAccount; error?: string }>;
  requestReferralPayout: (payoutAccountId: string) => Promise<{ success: boolean; payoutRequest?: PayoutRequest; error?: string }>;
  fetchSuperAdminData: () => Promise<void>;
  updateSubscriptionPlansByAdmin: (plans: SubscriptionPlanConfig[]) => Promise<{ success: boolean; error?: string }>;
  updateTokenPackagesByAdmin: (packages: TokenPackageConfig[]) => Promise<{ success: boolean; error?: string }>;
  updateSuperAdminConfigByAdmin: (patch: Partial<SuperAdminConfig>) => Promise<{ success: boolean; error?: string }>;
  processPayoutRequestByAdmin: (payoutId: string, action: 'APPROVE' | 'COMPLETE' | 'FAIL' | 'CANCEL', notes?: string, transactionRef?: string) => Promise<{ success: boolean; message: string }>;
  refundPaymentTransactionByAdmin: (transactionId: string, reason?: string) => Promise<{ success: boolean; message: string }>;
  runMasterSecurityMatrix: () => Promise<{ success: boolean; allPassed: boolean; passCount: number; failCount: number; tests: any[] }>;

  paymentsActiveTab: 'ledger' | 'wallet' | 'plans';
  setPaymentsActiveTab: (tab: 'ledger' | 'wallet' | 'plans') => void;

  // Customizable Keyboard Shortcuts
  shortcuts: KeyboardShortcut[];
  updateShortcut: (id: string, updated: Partial<KeyboardShortcut>) => { success: boolean; error?: string };
  resetShortcuts: () => void;

  // Helper Translation

}

const VelcoraContext = createContext<VelcoraContextType | undefined>(undefined);

export const VelcoraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 0. Persistent Auth, Session & Profile Sync
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<VelcoraUserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Authentication & Session Persistence
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const token = localStorage.getItem('velcora_session_token');
      const user = localStorage.getItem('velcora_session_user');
      return Boolean(token || user);
    } catch {
      return false;
    }
  });

  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem('velcora_onboarding_completed');
      if (val === 'false') return false;
      if (val === 'true') return true;
      // If there is an active session token/user, treat as completed; otherwise false for new user flow
      const token = localStorage.getItem('velcora_session_token');
      const user = localStorage.getItem('velcora_session_user');
      return Boolean(token || user);
    } catch {
      return false;
    }
  });

  const [authSessionType, setAuthSessionType] = useState<'owner' | 'staff' | 'demo' | null>(() => {
    try {
      return (localStorage.getItem('velcora_session_type') as any) || (isAuthenticated ? 'owner' : null);
    } catch {
      return null;
    }
  });

  // 1. Core Profile & Navigation
  const [businesses, setBusinesses] = useState<BusinessProfile[]>(() => INITIAL_BUSINESSES);
  const [activeBusinessId, setActiveBusinessId] = useState<string>(() => {
    try {
      return localStorage.getItem('velcora_active_business_id') || 'biz-clothing-01';
    } catch {
      return 'biz-clothing-01';
    }
  });
  const [activeMode, setActiveMode] = useState<'pos' | 'business'>('business');
  const [currentModule, setCurrentModule] = useState<SystemModuleKey | 'settings' | 'subusers'>('business_brain');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setAuthLoading(true);
      setAuthError(null);
      if (fbUser) {
        setAuthUser(fbUser);
        setIsAuthenticated(true);
        setAuthSessionType('owner');
        try {
          const { profile, activeBizId, businesses: userBizs } = await syncUserProfileAndBusiness(fbUser);
          setUserProfile(profile);
          if (userBizs && userBizs.length > 0) {
            setBusinesses(userBizs);
          }
          if (activeBizId) {
            setActiveBusinessId(activeBizId);
          }
          const ownerSub: SubUser = {
            id: fbUser.uid,
            businessId: activeBizId || 'biz-clothing-01',
            staffId: 'OWN-001',
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Business Owner',
            email: fbUser.email || '',
            roleId: 'role-owner',
            roleName: 'Business Owner',
            pinCode: '1234',
            isActive: true,
            createdAt: new Date().toISOString(),
          };
          setActiveUser(ownerSub);

          let isDone = true;
          const localVal = localStorage.getItem('velcora_onboarding_completed');
          if (localVal === 'false') {
            isDone = false;
          } else if (localVal === 'true') {
            isDone = true;
          } else if (profile.hasCompletedOnboarding !== undefined) {
            isDone = Boolean(profile.hasCompletedOnboarding);
          } else if (!profile.ownerBusinessId || profile.ownerBusinessId === `biz-${fbUser.uid.substring(0, 10)}`) {
            isDone = false;
          }
          setHasCompletedOnboarding(isDone);
          if (!isDone) {
            setIsOnboardingOpen(true);
          }

          try {
            localStorage.setItem('velcora_session_token', `token-fb-${fbUser.uid}`);
            localStorage.setItem('velcora_session_type', 'owner');
            localStorage.setItem('velcora_session_user', JSON.stringify(ownerSub));
          } catch {}
        } catch (err: any) {
          console.warn('Notice syncing user profile (fallback active):', err);
          const ownerSub: SubUser = {
            id: fbUser.uid,
            businessId: activeBusinessId || 'biz-clothing-01',
            staffId: 'OWN-001',
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Business Owner',
            email: fbUser.email || '',
            roleId: 'role-owner',
            roleName: 'Business Owner',
            pinCode: '1234',
            isActive: true,
            createdAt: new Date().toISOString(),
          };
          setActiveUser(ownerSub);
        }
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginAsOwner = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const user = await signInWithEmail(email, pass);
      setAuthUser(user);
      setIsAuthenticated(true);
      setAuthSessionType('owner');

      const ownerUser: SubUser = {
        id: user.uid,
        businessId: activeBusinessId || 'biz-clothing-01',
        staffId: 'OWN-001',
        name: user.displayName || user.email?.split('@')[0] || 'Business Owner',
        email: user.email || '',
        roleId: 'role-owner',
        roleName: 'Business Owner',
        pinCode: '1234',
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      setActiveUser(ownerUser);
      localStorage.setItem('velcora_session_token', `token-owner-${user.uid}-${Date.now()}`);
      localStorage.setItem('velcora_session_type', 'owner');
      localStorage.setItem('velcora_session_user', JSON.stringify(ownerUser));

      const onboardingDone = localStorage.getItem('velcora_onboarding_completed') !== 'false';
      setHasCompletedOnboarding(onboardingDone);
      if (!onboardingDone) {
        setIsOnboardingOpen(true);
      }
      return { success: true };
    } catch (err: any) {
      setAuthError(err.message || 'Failed to sign in.');
      return { success: false, error: err.message || 'Failed to sign in.' };
    } finally {
      setAuthLoading(false);
    }
  };

  const signupAsOwner = async (email: string, pass: string, name?: string, referralCode?: string): Promise<{ success: boolean; error?: string }> => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const user = await signUpWithEmail(email, pass);
      setAuthUser(user);
      setIsAuthenticated(true);
      setAuthSessionType('owner');
      setHasCompletedOnboarding(false);

      const ownerUser: SubUser = {
        id: user.uid,
        businessId: 'biz-new',
        staffId: 'OWN-001',
        name: name || user.displayName || user.email?.split('@')[0] || 'Business Owner',
        email: user.email || '',
        roleId: 'role-owner',
        roleName: 'Business Owner',
        pinCode: '1234',
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      setActiveUser(ownerUser);
      localStorage.setItem('velcora_session_token', `token-owner-${user.uid}-${Date.now()}`);
      localStorage.setItem('velcora_session_type', 'owner');
      localStorage.setItem('velcora_session_user', JSON.stringify(ownerUser));
      localStorage.setItem('velcora_onboarding_completed', 'false');

      if (referralCode) {
        applyReferralCode(referralCode).catch(() => {});
      }

      // Launch Step 2: Velcora POS Setup Wizard
      setIsOnboardingOpen(true);
      return { success: true };
    } catch (err: any) {
      setAuthError(err.message || 'Failed to create business account.');
      return { success: false, error: err.message || 'Failed to create business account.' };
    } finally {
      setAuthLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      let user = await signInWithGoogle();
      if (!user) {
        return { success: false, error: 'Google sign-in was cancelled.' };
      }
      setAuthUser(user);
      setIsAuthenticated(true);
      setAuthSessionType('owner');

      const ownerUser: SubUser = {
        id: user.uid,
        businessId: activeBusinessId || 'biz-clothing-01',
        staffId: 'OWN-001',
        name: user.displayName || user.email?.split('@')[0] || 'Business Owner',
        email: user.email || '',
        roleId: 'role-owner',
        roleName: 'Business Owner',
        pinCode: '1234',
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      setActiveUser(ownerUser);
      localStorage.setItem('velcora_session_token', `token-owner-${user.uid}-${Date.now()}`);
      localStorage.setItem('velcora_session_type', 'owner');
      localStorage.setItem('velcora_session_user', JSON.stringify(ownerUser));

      const onboardingDone = localStorage.getItem('velcora_onboarding_completed') !== 'false';
      setHasCompletedOnboarding(onboardingDone);
      if (!onboardingDone) {
        setIsOnboardingOpen(true);
      }
      return { success: true };
    } catch (err: any) {
      setAuthError(err.message || 'Google sign-in failed.');
      return { success: false, error: err.message || 'Google sign-in failed.' };
    } finally {
      setAuthLoading(false);
    }
  };

  const sendPhoneOtpCode = async (phone: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const res = await sendPhoneOtp(phone);
      return res;
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to dispatch verification code.' };
    }
  };

  const loginWithPhoneOtpCode = async (otpCode: string, phone?: string): Promise<{ success: boolean; error?: string }> => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const user = await verifyPhoneOtp(otpCode, phone);
      setAuthUser(user);
      setIsAuthenticated(true);
      setAuthSessionType('owner');

      const ownerUser: SubUser = {
        id: user.uid,
        businessId: activeBusinessId || 'biz-clothing-01',
        staffId: 'OWN-001',
        name: user.displayName || 'Business Owner',
        email: user.email || '',
        roleId: 'role-owner',
        roleName: 'Business Owner',
        pinCode: '1234',
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      setActiveUser(ownerUser);
      localStorage.setItem('velcora_session_token', `token-owner-${user.uid}-${Date.now()}`);
      localStorage.setItem('velcora_session_type', 'owner');
      localStorage.setItem('velcora_session_user', JSON.stringify(ownerUser));

      const onboardingDone = localStorage.getItem('velcora_onboarding_completed') !== 'false';
      setHasCompletedOnboarding(onboardingDone);
      if (!onboardingDone) {
        setIsOnboardingOpen(true);
      }
      return { success: true };
    } catch (err: any) {
      setAuthError(err?.message || 'Phone OTP verification failed.');
      return { success: false, error: err?.message || 'Phone OTP verification failed.' };
    } finally {
      setAuthLoading(false);
    }
  };

  const loginAsStaff = async (staffIdParam: string, password?: string, pinCode?: string): Promise<{ success: boolean; staff?: SubUser; error?: string }> => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      let verifiedStaff: SubUser | null = null;
      try {
        const res = await fetch('/api/staff/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: activeBusinessId,
            staffId: staffIdParam,
            password,
            pinCode,
            deviceId: getOrCreateDeviceId(),
            deviceName: 'Web Terminal'
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.staff) {
            verifiedStaff = data.staff;
          }
        }
      } catch (apiErr) {
        console.warn('Staff API offline or unreachable, checking local registered staff:', apiErr);
      }

      if (!verifiedStaff) {
        const found = subusers.find(u => 
          (u.staffId?.toUpperCase() === staffIdParam.trim().toUpperCase() || u.id.toUpperCase() === staffIdParam.trim().toUpperCase()) &&
          (u.isActive !== false)
        );
        if (found) {
          verifiedStaff = found;
        }
      }

      if (!verifiedStaff) {
        return { success: false, error: `Invalid Staff ID (${staffIdParam}) or account inactive. Please ask your store owner.` };
      }

      setActiveUser(verifiedStaff);
      setIsAuthenticated(true);
      setAuthSessionType('staff');
      setHasCompletedOnboarding(true);
      setIsOnboardingOpen(false);

      localStorage.setItem('velcora_session_token', `token-staff-${verifiedStaff.id}-${Date.now()}`);
      localStorage.setItem('velcora_session_type', 'staff');
      localStorage.setItem('velcora_session_user', JSON.stringify(verifiedStaff));

      if (verifiedStaff.roleId === 'role-cashier') {
        setCurrentModule('pos');
        setActiveMode('pos');
      } else {
        setCurrentModule('business_brain');
        setActiveMode('business');
      }

      return { success: true, staff: verifiedStaff };
    } catch (err: any) {
      return { success: false, error: err.message || 'Staff login failed.' };
    } finally {
      setAuthLoading(false);
    }
  };

  const quickLoginAsDemo = async (role: 'owner' | 'manager' | 'cashier' | 'inventory' | 'accountant') => {
    let targetUser: SubUser;
    switch (role) {
      case 'manager':
        targetUser = subusers.find(u => u.roleId === 'role-manager' || u.staffId === 'MGR-001') || {
          id: 'sub-mgr-01',
          businessId: activeBusinessId,
          staffId: 'MGR-001',
          name: 'Alexandre Mercer',
          email: 'manager@velcora-store.com',
          roleId: 'role-manager',
          roleName: 'Store Manager',
          pinCode: '2048',
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        break;
      case 'cashier':
        targetUser = subusers.find(u => u.roleId === 'role-cashier' || u.staffId === 'STF-001') || {
          id: 'sub-stf-01',
          businessId: activeBusinessId,
          staffId: 'STF-001',
          name: 'Elena Rostova',
          email: 'elena.pos@velcora-store.com',
          roleId: 'role-cashier',
          roleName: 'Lead Cashier',
          pinCode: '1234',
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        break;
      case 'inventory':
        targetUser = subusers.find(u => u.roleId === 'role-inventory' || u.staffId === 'INV-001') || {
          id: 'sub-inv-01',
          businessId: activeBusinessId,
          staffId: 'INV-001',
          name: 'Tariq Vance',
          email: 'inventory@velcora-store.com',
          roleId: 'role-inventory',
          roleName: 'Inventory Specialist',
          pinCode: '3344',
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        break;
      case 'accountant':
        targetUser = subusers.find(u => u.roleId === 'role-accountant' || u.staffId === 'ACC-001') || {
          id: 'sub-acc-01',
          businessId: activeBusinessId,
          staffId: 'ACC-001',
          name: 'Claire Beauchamp',
          email: 'finance@velcora-store.com',
          roleId: 'role-accountant',
          roleName: 'Accountant',
          pinCode: '9900',
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        break;
      case 'owner':
      default:
        targetUser = {
          id: 'usr-owner-demo',
          businessId: activeBusinessId,
          staffId: 'OWN-001',
          name: 'Sarah Jenkins (Owner)',
          email: 'owner@velcora-store.com',
          roleId: 'role-owner',
          roleName: 'Business Owner',
          pinCode: '1234',
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        break;
    }

    setActiveUser(targetUser);
    setIsAuthenticated(true);
    setAuthSessionType(role === 'owner' ? 'owner' : 'staff');
    setHasCompletedOnboarding(true);
    setIsOnboardingOpen(false);

    localStorage.setItem('velcora_session_token', `token-demo-${targetUser.id}-${Date.now()}`);
    localStorage.setItem('velcora_session_type', role === 'owner' ? 'owner' : 'staff');
    localStorage.setItem('velcora_session_user', JSON.stringify(targetUser));

    if (role === 'cashier') {
      setCurrentModule('pos');
      setActiveMode('pos');
    } else {
      setCurrentModule('business_brain');
      setActiveMode('business');
    }
  };

  const logout = async () => {
    try {
      await logoutUser().catch(() => {});
    } catch (err: any) {
      console.error('Logout error:', err);
    }
    localStorage.removeItem('velcora_session_token');
    localStorage.removeItem('velcora_session_user');
    localStorage.removeItem('velcora_session_type');
    localStorage.removeItem('velcora_onboarding_completed');
    localStorage.removeItem('velcora_active_business_id');
    setAuthUser(null);
    setUserProfile(null);
    setIsAuthenticated(false);
    setAuthSessionType(null);
    setHasCompletedOnboarding(false);
    setIsOnboardingOpen(false);
    setActiveUser(DEFAULT_SUBUSERS[0]);
  };

  const handleSetCurrentModule = (mod: SystemModuleKey | 'settings' | 'subusers') => {
    setCurrentModule(mod);
    if (mod === 'pos') {
      setActiveMode('pos');
    } else {
      setActiveMode('business');
    }
  };

  const handleSetActiveMode = (mode: 'pos' | 'business') => {
    setActiveMode(mode);
    if (mode === 'pos') {
      setCurrentModule('pos');
    } else if (currentModule === 'pos') {
      setCurrentModule('business_brain');
    }
  };

  const activeBusiness = useMemo(() => {
    const biz = businesses.find(b => b.id === activeBusinessId) || businesses[0] || INITIAL_BUSINESSES[0];
    if (biz && biz.taxRateDefault > 1) {
      return { ...biz, taxRateDefault: biz.taxRateDefault / 100 };
    }
    return biz;
  }, [businesses, activeBusinessId]);

  const [locale, setLocaleState] = useState<LocaleCode>(activeBusiness.language || 'en');
  
  const setLocale = (loc: LocaleCode) => {
    setLocaleState(loc);
    setBusinesses(prev => prev.map(b => b.id === activeBusinessId ? { ...b, language: loc } : b));
    if (activeBusinessId) {
      setDoc(doc(db, 'businesses', activeBusinessId), { language: loc }, { merge: true })
        .catch(err => console.error('Failed to update language', err));
    }
  };
  const [currency, setCurrency] = useState<CurrencyCode>(activeBusiness.currency || 'USD');
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('velcora_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'dark'; // Professional dark slate canvas by default
  });

  const primaryColor = activeBusiness.primaryColor || '#5B5CE2';

  const setPrimaryColor = (colorHex: string) => {
    setBusinesses(prev => prev.map(b => b.id === activeBusiness.id ? { ...b, primaryColor: colorHex } : b));
  };

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('velcora_theme', newTheme);
    } catch {}
  };

  const toggleTheme = () => {
    setThemeState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('velcora_theme', next);
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (theme === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    // Dynamic brand color palette CSS custom variables
    const palette = VELCORA_COLOR_PALETTES.find(p => p.hex.toLowerCase() === primaryColor.toLowerCase()) || VELCORA_COLOR_PALETTES[0];
    root.style.setProperty('--velcora-primary', palette.hex);
    root.style.setProperty('--velcora-primary-dark', palette.hoverHex);
    root.style.setProperty('--velcora-primary-light', palette.lightBg);
    root.style.setProperty('--brand-primary', palette.hex);
    root.style.setProperty('--brand-primary-hover', palette.hoverHex);
    root.style.setProperty('--brand-primary-light', palette.lightBg);
    root.style.setProperty('--brand-primary-ring', palette.ringHex);
    root.style.setProperty('--color-primary', palette.hex);
    root.style.setProperty('--color-primary-dark', palette.hoverHex);
  }, [theme, primaryColor]);

  // 2. Roles, Subusers & Workstations
  const [roles, setRoles] = useState<UserRole[]>(() => SYSTEM_ROLES);
  const [subusers, setSubusers] = useState<SubUser[]>(() => DEFAULT_SUBUSERS);
  const [activeUser, setActiveUser] = useState<SubUser>(() => {
    try {
      const savedUser = localStorage.getItem('velcora_session_user');
      if (savedUser) return JSON.parse(savedUser);
    } catch {}
    return DEFAULT_SUBUSERS[0];
  });

  // Workstations fleet
  const [workstations, setWorkstations] = useState<Workstation[]>(() => DEFAULT_WORKSTATIONS);

  const addWorkstation = (ws: Workstation) => setWorkstations(prev => [ws, ...prev]);
  const updateWorkstation = (id: string, patch: Partial<Workstation>) => {
    setWorkstations(prev => prev.map(w => (w.id === id ? { ...w, ...patch } : w)));
  };
  const deleteWorkstation = (id: string) => setWorkstations(prev => prev.filter(w => w.id !== id));

  // Onboarding & Floating AI
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState<boolean>(false);

  // 3. Firestore Real-Time Subscriptions & Cloud Persistence
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('velcora_products');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem('velcora_customers');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyRuleConfig>(() => DEFAULT_LOYALTY_CONFIG);
  const [sales, setSales] = useState<SaleTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('velcora_sales');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem('velcora_expenses');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Local persistence sync
  useEffect(() => {
    try {
      localStorage.setItem('velcora_products', JSON.stringify(products));
    } catch (e) {}
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem('velcora_customers', JSON.stringify(customers));
    } catch (e) {}
  }, [customers]);

  useEffect(() => {
    try {
      localStorage.setItem('velcora_sales', JSON.stringify(sales));
    } catch (e) {}
  }, [sales]);

  useEffect(() => {
    try {
      localStorage.setItem('velcora_expenses', JSON.stringify(expenses));
    } catch (e) {}
  }, [expenses]);

  // Subscribe to real-time Firestore changes for the active business
  useEffect(() => {
    if (!activeBusinessId) return;

    // A. Real-time Products Sync
    const unsubProducts = onSnapshot(
      collection(db, 'businesses', activeBusinessId, 'products'),
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudProds = snapshot.docs.map(doc => ({ id: doc.id, businessId: doc.data().businessId || activeBusinessId, ...doc.data() } as Product));
          setProducts(cloudProds);
        } else {
          setProducts([]);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `businesses/${activeBusinessId}/products`)
    );

    // B. Real-time Customers Sync
    const unsubCustomers = onSnapshot(
      collection(db, 'businesses', activeBusinessId, 'customers'),
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudCusts = snapshot.docs.map(doc => ({ id: doc.id, businessId: doc.data().businessId || activeBusinessId, ...doc.data() } as Customer));
          setCustomers(cloudCusts);
        } else {
          setCustomers([]);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `businesses/${activeBusinessId}/customers`)
    );

    // C. Real-time Sales Sync
    const unsubSales = onSnapshot(
      collection(db, 'businesses', activeBusinessId, 'sales'),
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudSales = snapshot.docs.map(doc => ({ id: doc.id, businessId: doc.data().businessId || activeBusinessId, ...doc.data() } as SaleTransaction));
          setSales(cloudSales);
        } else {
          setSales([]);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `businesses/${activeBusinessId}/sales`)
    );

    // D. Real-time Expenses Sync
    const unsubExpenses = onSnapshot(
      collection(db, 'businesses', activeBusinessId, 'expenses'),
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudExpenses = snapshot.docs.map(doc => ({ id: doc.id, businessId: doc.data().businessId || activeBusinessId, ...doc.data() } as Expense));
          setExpenses(cloudExpenses);
        } else {
          setExpenses([]);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `businesses/${activeBusinessId}/expenses`)
    );

    // E. Real-time Subusers Sync
    const unsubSubusers = onSnapshot(
      collection(db, 'businesses', activeBusinessId, 'subusers'),
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudSubusers = snapshot.docs.map(doc => ({ id: doc.id, businessId: doc.data().businessId || activeBusinessId, ...doc.data() } as SubUser));
          setSubusers(cloudSubusers);
        } else {
          setSubusers([]);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `businesses/${activeBusinessId}/subusers`)
    );

    // F. Real-time Suppliers Sync
    const unsubSuppliers = onSnapshot(
      collection(db, 'businesses', activeBusinessId, 'suppliers'),
      (snapshot) => {
        if (!snapshot.empty) {
          setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, businessId: doc.data().businessId || activeBusinessId, ...doc.data() } as Supplier)));
        } else {
          setSuppliers([]);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `businesses/${activeBusinessId}/suppliers`)
    );

    // G. Real-time Workstations Sync
    const unsubWorkstations = onSnapshot(
      collection(db, 'businesses', activeBusinessId, 'workstations'),
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudWs = snapshot.docs.map(doc => ({ id: doc.id, deviceId: doc.id, businessId: doc.data().businessId || activeBusinessId, ...doc.data() } as Workstation));
          setWorkstations(cloudWs);
        } else {
          setWorkstations([]);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `businesses/${activeBusinessId}/workstations`)
    );

    // H. Real-time Roles Sync
    const unsubRoles = onSnapshot(
      collection(db, 'businesses', activeBusinessId, 'roles'),
      (snapshot) => {
        if (!snapshot.empty) {
          setRoles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserRole)));
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `businesses/${activeBusinessId}/roles`)
    );

    // I. Real-time Budgets Sync
    const unsubBudgets = onSnapshot(
      collection(db, 'businesses', activeBusinessId, 'budgets'),
      (snapshot) => {
        if (!snapshot.empty) {
          setBudgets(snapshot.docs.map(doc => ({ id: doc.id, businessId: doc.data().businessId || activeBusinessId, ...doc.data() } as Budget)));
        } else {
          setBudgets([]);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `businesses/${activeBusinessId}/budgets`)
    );

    // J. Real-time Purchase Orders Sync
    const unsubPurchaseOrders = onSnapshot(
      collection(db, 'businesses', activeBusinessId, 'purchaseOrders'),
      (snapshot) => {
        if (!snapshot.empty) {
          setPurchaseOrders(snapshot.docs.map(doc => ({ id: doc.id, businessId: doc.data().businessId || activeBusinessId, ...doc.data() } as PurchaseOrder)));
        } else {
          setPurchaseOrders([]);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `businesses/${activeBusinessId}/purchaseOrders`)
    );

    // K. Real-time Sale Orders Sync
    const unsubSaleOrders = onSnapshot(
      collection(db, 'businesses', activeBusinessId, 'saleOrders'),
      (snapshot) => {
        if (!snapshot.empty) {
          setSaleOrders(snapshot.docs.map(doc => ({ id: doc.id, businessId: doc.data().businessId || activeBusinessId, ...doc.data() } as SaleOrder)));
        } else {
          setSaleOrders([]);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `businesses/${activeBusinessId}/saleOrders`)
    );

    // L. Real-time Estimates Sync
    const unsubEstimates = onSnapshot(
      collection(db, 'businesses', activeBusinessId, 'estimates'),
      (snapshot) => {
        if (!snapshot.empty) {
          setEstimates(snapshot.docs.map(doc => ({ id: doc.id, businessId: doc.data().businessId || activeBusinessId, ...doc.data() } as Estimate)));
        } else {
          setEstimates([]);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `businesses/${activeBusinessId}/estimates`)
    );

    // M. Real-time Credit Notes Sync
    const unsubCreditNotes = onSnapshot(
      collection(db, 'businesses', activeBusinessId, 'creditNotes'),
      (snapshot) => {
        if (!snapshot.empty) {
          setCreditNotes(snapshot.docs.map(doc => ({ id: doc.id, businessId: doc.data().businessId || activeBusinessId, ...doc.data() } as CreditNote)));
        } else {
          setCreditNotes([]);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `businesses/${activeBusinessId}/creditNotes`)
    );

    // N. Real-time Delivery Notes Sync
    const unsubDeliveryNotes = onSnapshot(
      collection(db, 'businesses', activeBusinessId, 'deliveryNotes'),
      (snapshot) => {
        if (!snapshot.empty) {
          setDeliveryNotes(snapshot.docs.map(doc => ({ id: doc.id, businessId: doc.data().businessId || activeBusinessId, ...doc.data() } as DeliveryNote)));
        } else {
          setDeliveryNotes([]);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `businesses/${activeBusinessId}/deliveryNotes`)
    );

    // O. Real-time Other Incomes Sync
    const unsubOtherIncomes = onSnapshot(
      collection(db, 'businesses', activeBusinessId, 'otherIncomes'),
      (snapshot) => {
        if (!snapshot.empty) {
          setOtherIncomes(snapshot.docs.map(doc => ({ id: doc.id, businessId: doc.data().businessId || activeBusinessId, ...doc.data() } as OtherIncome)));
        } else {
          setOtherIncomes([]);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `businesses/${activeBusinessId}/otherIncomes`)
    );

    return () => {
      unsubProducts();
      unsubCustomers();
      unsubSales();
      unsubExpenses();
      unsubSubusers();
      unsubSuppliers();
      unsubWorkstations();
      unsubRoles();
      unsubBudgets();
      unsubPurchaseOrders();
      unsubSaleOrders();
      unsubEstimates();
      unsubCreditNotes();
      unsubDeliveryNotes();
      unsubOtherIncomes();
    };
  }, [activeBusinessId]);

  // Offline / Network Connection state
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Offline sales queue state backed by localStorage
  const [offlineSalesQueue, setOfflineSalesQueue] = useState<SaleTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('velcora_offline_sales_queue');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Persist offline sales queue when it changes
  useEffect(() => {
    try {
      localStorage.setItem('velcora_offline_sales_queue', JSON.stringify(offlineSalesQueue));
    } catch (e) {}
  }, [offlineSalesQueue]);

  // Define syncOfflineSales
  const syncOfflineSales = async (): Promise<{ success: boolean; syncedCount: number; error?: string }> => {
    if (offlineSalesQueue.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    let syncedCount = 0;
    const remainingQueue: SaleTransaction[] = [...offlineSalesQueue];

    try {
      for (const sale of offlineSalesQueue) {
        // Prepare the synchronized sale object
        const syncedSale: SaleTransaction = {
          ...sale,
          syncStatus: 'synced',
          isOffline: false,
        };

        // Write to firestore
        await setDoc(doc(db, 'businesses', sale.businessId, 'sales', sale.id), cleanObjectForFirestore(syncedSale));
        
        // Remove from the remaining queue
        const index = remainingQueue.findIndex(s => s.id === sale.id);
        if (index > -1) {
          remainingQueue.splice(index, 1);
        }
        syncedCount++;
      }

      setOfflineSalesQueue(remainingQueue);
      return { success: true, syncedCount };
    } catch (err: any) {
      console.error('Error syncing offline sales:', err);
      setOfflineSalesQueue(remainingQueue);
      return { 
        success: false, 
        syncedCount, 
        error: err?.message || 'Failed to sync some offline sales to the cloud.' 
      };
    }
  };

  // Trigger auto sync when coming back online
  useEffect(() => {
    if (!isOffline && offlineSalesQueue.length > 0) {
      console.log('App returned online. Auto-syncing offline orders...');
      syncOfflineSales();
    }
  }, [isOffline]);

  // Workstation Device Registration & Heartbeat Sync
  useEffect(() => {
    if (!activeBusinessId) return;

    // Register or update current device
    syncAndRegisterDevice(
      activeBusinessId,
      authUser?.uid || activeUser.id,
      authUser?.displayName || activeUser.name,
      activeUser.roleId
    );

    // Heartbeat interval (every 30 seconds when online)
    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        syncAndRegisterDevice(
          activeBusinessId,
          authUser?.uid || activeUser.id,
          authUser?.displayName || activeUser.name,
          activeUser.roleId
        );
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, [activeBusinessId, authUser, activeUser]);

  // 5. Suppliers & Purchasing
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    try {
      const saved = localStorage.getItem('velcora_suppliers');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem('velcora_suppliers', JSON.stringify(suppliers));
    } catch (e) {}
  }, [suppliers]);

  // 6. Sales, Estimates, Invoices, Delivery Notes
  const [saleOrders, setSaleOrders] = useState<SaleOrder[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);

  // 7. Finance & Budgets
  const [otherIncomes, setOtherIncomes] = useState<OtherIncome[]>(() => {
    try {
      const saved = localStorage.getItem('velcora_other_incomes');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('velcora_other_incomes', JSON.stringify(otherIncomes));
    } catch (e) {}
  }, [otherIncomes]);

  const [commissions, setCommissions] = useState<CommissionRule[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>(() => {
    try {
      const saved = localStorage.getItem('velcora_budgets');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [loans, setLoans] = useState<Loan[]>(() => {
    try {
      const saved = localStorage.getItem('velcora_loans');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [customerCredits, setCustomerCredits] = useState<CustomerCredit[]>(() => {
    try {
      const saved = localStorage.getItem('velcora_customer_credits');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [supplierPayables, setSupplierPayables] = useState<SupplierPayable[]>(() => {
    try {
      const saved = localStorage.getItem('velcora_supplier_payables');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  // Keep localStorage sync updated
  useEffect(() => {
    localStorage.setItem('velcora_budgets', JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    localStorage.setItem('velcora_loans', JSON.stringify(loans));
  }, [loans]);

  useEffect(() => {
    localStorage.setItem('velcora_customer_credits', JSON.stringify(customerCredits));
  }, [customerCredits]);

  useEffect(() => {
    localStorage.setItem('velcora_supplier_payables', JSON.stringify(supplierPayables));
  }, [supplierPayables]);

  // Promotions & Discounts
  const [promotions, setPromotions] = useState<PromotionCampaign[]>(() => {
    try {
      const saved = localStorage.getItem('velcora_promotions');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('velcora_promotions', JSON.stringify(promotions));
    } catch (e) {}
  }, [promotions]);

  const addPromotion = (promo: PromotionCampaign) => setPromotions(prev => [promo, ...prev]);
  const updatePromotion = (id: string, patch: Partial<PromotionCampaign>) => {
    setPromotions(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
  };
  const deletePromotion = (id: string) => setPromotions(prev => prev.filter(p => p.id !== id));

  // Tax Rates
  const [taxRates, setTaxRates] = useState<TaxRateConfig[]>(() => {
    try {
      const saved = localStorage.getItem('velcora_tax_rates');
      return saved ? JSON.parse(saved) : INITIAL_TAX_RATES;
    } catch (e) {
      return INITIAL_TAX_RATES;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('velcora_tax_rates', JSON.stringify(taxRates));
    } catch (e) {}
  }, [taxRates]);

  const addTaxRate = (tax: TaxRateConfig) => setTaxRates(prev => [...prev, tax]);
  const updateTaxRate = (id: string, patch: Partial<TaxRateConfig>) => {
    setTaxRates(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));
  };
  const deleteTaxRate = (id: string) => setTaxRates(prev => prev.filter(t => t.id !== id));

  // Payments
  const [paymentsList, setPaymentsList] = useState<PaymentRecord[]>(() => {
    try {
      const saved = localStorage.getItem('velcora_payments');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('velcora_payments', JSON.stringify(paymentsList));
    } catch (e) {}
  }, [paymentsList]);

  const addPaymentRecord = (pay: PaymentRecord) => setPaymentsList(prev => [pay, ...prev]);

  // 8. POS Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [redeemPoints, setRedeemPoints] = useState<number>(0);
  const [heldCarts, setHeldCarts] = useState<{ id: string; name: string; items: CartItem[]; customerId?: string; createdAt: string }[]>([]);

  // 9. AI Router & Models
  const [aiModels] = useState<AIModelDefinition[]>(DEFAULT_AI_MODELS);
  const [activeModelId, setActiveModelId] = useState<string>('velcora-chat');
  const [aiUsageStats, setAiUsageStats] = useState({ requestsCount: 14, tokensConsumed: 18400, totalCost: 0.024 });

  // 10. Goals & Alerts & Actionable Tasks
  const [businessGoals, setBusinessGoals] = useState<BusinessGoal[]>(() => {
    try {
      const saved = localStorage.getItem('velcora_business_goals');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('velcora_business_goals', JSON.stringify(businessGoals));
    } catch (e) {}
  }, [businessGoals]);
  const [tasks, setTasks] = useState<BusinessTask[]>(() => {
    try {
      const saved = localStorage.getItem('velcora_tasks_biz-clothing-01');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'task-1',
        businessId: 'biz-clothing-01',
        title: 'Restock Italian Leather Loafers',
        description: 'Current stock is 6 units, which is below the safety reorder threshold of 8.',
        category: 'inventory',
        priority: 'high',
        status: 'pending',
        assignedTo: 'Store Manager',
        dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
        createdAt: new Date().toISOString(),
        source: 'ai_agent',
      },
      {
        id: 'task-2',
        businessId: 'biz-clothing-01',
        title: 'Launch Weekend VIP Promotion Campaign',
        description: 'Broadcast SMS/WhatsApp campaign with 15% discount for Tier 1 loyalty customers.',
        category: 'marketing',
        priority: 'medium',
        status: 'pending',
        assignedTo: 'Alex Mercer',
        dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
        createdAt: new Date().toISOString(),
        source: 'ai_agent',
      },
      {
        id: 'task-3',
        businessId: 'biz-clothing-01',
        title: 'Audit Cash Drawer & End-of-Day Ledger',
        description: 'Reconcile POS cash payments and digital card terminal receipts.',
        category: 'finance',
        priority: 'medium',
        status: 'completed',
        assignedTo: 'Emma Watson',
        dueDate: new Date().toISOString(),
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        completedAt: new Date().toISOString(),
        source: 'user',
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(`velcora_tasks_${activeBusinessId}`, JSON.stringify(tasks));
    } catch (e) {}
  }, [tasks, activeBusinessId]);

  const addTask = (task: BusinessTask) => {
    setTasks(prev => [task, ...prev]);
  };

  const updateTask = (id: string, patch: Partial<BusinessTask>) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const executeAiAction = (action: AiActionProposal | { type?: string; actionType?: string; payload: any }): { success: boolean; message: string; data?: any } => {
    try {
      const type = (action as any).actionType || (action as any).type;
      const payload = action.payload || {};
      if (type === 'CREATE_TASK') {
        const newTask: BusinessTask = {
          id: `task-${Date.now()}`,
          businessId: activeBusinessId,
          title: payload.title || 'Actionable Task',
          description: payload.description || '',
          category: payload.category || 'general',
          priority: payload.priority || 'medium',
          status: 'pending',
          assignedTo: payload.assignedTo || activeUser.name,
          dueDate: payload.dueDate || new Date(Date.now() + 86400000).toISOString(),
          createdAt: new Date().toISOString(),
          source: 'ai_agent',
        };
        addTask(newTask);
        return { success: true, message: `Task "${newTask.title}" created successfully.`, data: newTask };
      }
      if (type === 'CREATE_GOAL') {
        const newGoal: BusinessGoal = {
          id: `goal-${Date.now()}`,
          businessId: activeBusinessId,
          title: payload.title || 'New Business Goal',
          metric: payload.metric || 'revenue',
          targetValue: Number(payload.targetValue) || 10000,
          currentValue: Number(payload.currentValue) || 0,
          unit: payload.unit || '$',
          deadline: payload.deadline || new Date(Date.now() + 30 * 86400000).toISOString(),
          status: 'on_track',
        };
        addBusinessGoal(newGoal);
        return { success: true, message: `Goal "${newGoal.title}" activated.`, data: newGoal };
      }
      if (type === 'CREATE_EXPENSE') {
        const validCategories = ['Rent', 'Salaries', 'Utilities', 'Marketing', 'Transport', 'Maintenance', 'Taxes', 'Software', 'Packaging', 'Miscellaneous'];
        const chosenCategory = validCategories.includes(payload.category) ? payload.category : 'Miscellaneous';
        const newExpense: Expense = {
          id: `exp-${Date.now()}`,
          businessId: activeBusinessId,
          title: payload.title || payload.description || 'Recorded Expense',
          amount: Number(payload.amount) || 0,
          category: chosenCategory as any,
          date: payload.date || new Date().toISOString().slice(0, 10),
          paymentMethod: payload.paymentMethod || 'cash',
          isRecurring: false,
          receiptNote: payload.receiptNote || payload.notes || 'Logged via Velcora AI Action Agent',
        };
        addExpense(newExpense);
        return { success: true, message: `Expense of ${activeBusiness.currencySymbol || '$'}${newExpense.amount.toFixed(2)} recorded for "${newExpense.title}".`, data: newExpense };
      }
      if (type === 'CREATE_PURCHASE_ORDER') {
        const newPO: PurchaseOrder = {
          id: `po-${Date.now()}`,
          businessId: activeBusinessId,
          poNumber: `PO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
          supplierId: payload.supplierId || suppliers[0]?.id || 'sup-gen',
          supplierName: payload.supplierName || suppliers[0]?.name || 'Primary Supplier',
          items: payload.items || [
            {
              productId: payload.productId || products[0]?.id || 'prod-1',
              name: payload.productName || 'Stock Replenishment',
              sku: payload.sku || 'SKU-AUTO',
              quantityOrdered: Number(payload.quantity) || 10,
              quantityReceived: 0,
              unitCost: Number(payload.unitCost) || 25,
              totalCost: (Number(payload.quantity) || 10) * (Number(payload.unitCost) || 25),
            }
          ],
          totalAmount: payload.totalAmount || (payload.items ? payload.items.reduce((acc: number, it: any) => acc + (it.totalCost || 0), 0) : 250),
          amountPaid: 0,
          status: 'ordered',
          orderDate: new Date().toISOString(),
        };
        addPurchaseOrder(newPO);
        return { success: true, message: `Purchase Order ${newPO.poNumber} created for ${newPO.supplierName}.`, data: newPO };
      }
      if (type === 'ADJUST_STOCK') {
        const { productId, delta } = payload;
        if (productId && delta) {
          adjustStock(productId, delta);
          return { success: true, message: `Stock adjusted by ${delta > 0 ? '+' : ''}${delta} units.` };
        }
      }
      if (type === 'OPEN_MODULE') {
        if (payload.module) {
          handleSetCurrentModule(payload.module);
          return { success: true, message: `Navigated to ${payload.module} module.` };
        }
      }
      return { success: false, message: `Unknown action type: ${type}` };
    } catch (err: any) {
      return { success: false, message: `Failed to execute action: ${err?.message || err}` };
    }
  };

  const [smartAlerts, setSmartAlerts] = useState<SmartAlert[]>([
    { id: 'alert-1', type: 'WARNING', title: 'Low Stock: Italian Leather Loafers', message: 'Current stock is 6 units, which is below safety reorder threshold (8).', timestamp: new Date().toISOString(), read: false, actionRoute: 'inventory' },
    { id: 'alert-2', type: 'INFO', title: 'Daily Sales Milestone', message: 'Today\'s POS gross volume surpassed $750.00 across 3 orders.', timestamp: new Date().toISOString(), read: false, actionRoute: 'sales' },
  ]);

  // 11. Online Store Orders & Studio Assets
  const [onlineOrders, setOnlineOrders] = useState<OnlineStoreOrder[]>([
    {
      id: 'ord-on-101',
      businessId: 'biz-clothing-01',
      orderNumber: 'WEB-9021',
      customerName: 'Elena Rostova',
      customerPhone: '+1 (555) 300-8811',
      customerAddress: '55 Wall St, Penthouse 4, New York, NY',
      items: [{ productId: 'prod-c1', name: 'Silk Blend Tailored Blazer', quantity: 1, unitPrice: 189 }],
      totalAmount: 204.12,
      paymentMethod: 'online_card',
      paymentStatus: 'paid',
      deliveryStatus: 'packed',
      createdAt: '2026-02-26T09:15:00Z',
    },
  ]);

  const [sharedIntelligenceContext, setSharedIntelligenceContext] = useState<{
    lastRecommendedProduct: {
      id: string;
      name: string;
      category: string;
      price: number;
      stock: number;
      unitsSold: number;
      description?: string;
    } | null;
    lastPromptOrCreativeRequest: string | null;
    bestSellingProduct: {
      id: string;
      name: string;
      category: string;
      price: number;
      unitsSold: number;
    } | null;
    pastRecommendationsOutcomes: Array<{
      recommendationId: string;
      productName: string;
      category: string;
      date: string;
      outcome: 'increased' | 'decreased' | 'flat' | 'pending';
      unitsSoldBefore: number;
      unitsSoldAfter?: number;
    }>;
  }>({
    lastRecommendedProduct: null,
    lastPromptOrCreativeRequest: null,
    bestSellingProduct: null,
    pastRecommendationsOutcomes: [
      {
        recommendationId: 'rec-silk-blazer',
        productName: 'Silk Blend Tailored Blazer',
        category: 'Blazers',
        date: '2026-08-15',
        outcome: 'increased',
        unitsSoldBefore: 4,
        unitsSoldAfter: 14
      },
      {
        recommendationId: 'rec-leather-loafers',
        productName: 'Italian Leather Loafers',
        category: 'Footwear',
        date: '2026-08-10',
        outcome: 'flat',
        unitsSoldBefore: 1,
        unitsSoldAfter: 1
      }
    ]
  });

  const recordRecommendationOutcome = (
    recommendationId: string,
    productName: string,
    category: string,
    outcome: 'increased' | 'decreased' | 'flat' | 'pending'
  ) => {
    setSharedIntelligenceContext(prev => {
      const exists = prev.pastRecommendationsOutcomes.some(r => r.recommendationId === recommendationId);
      if (exists) {
        return {
          ...prev,
          pastRecommendationsOutcomes: prev.pastRecommendationsOutcomes.map(r =>
            r.recommendationId === recommendationId ? { ...r, outcome } : r
          )
        };
      }
      return {
        ...prev,
        pastRecommendationsOutcomes: [
          ...prev.pastRecommendationsOutcomes,
          {
            recommendationId,
            productName,
            category,
            date: new Date().toISOString().split('T')[0],
            outcome,
            unitsSoldBefore: 6,
            unitsSoldAfter: outcome === 'increased' ? 15 : outcome === 'decreased' ? 2 : 6
          }
        ]
      };
    });
  };

  // Persistence Sync
  useEffect(() => {
    localStorage.setItem('velcora_businesses', JSON.stringify(businesses));
  }, [businesses]);

  useEffect(() => {
    localStorage.setItem('velcora_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('velcora_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('velcora_sales', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem('velcora_loyalty_config', JSON.stringify(loyaltyConfig));
  }, [loyaltyConfig]);

  // Derived Business Brain Metrics
  const activeProducts = useMemo(() => products.filter(p => p.businessId === activeBusiness.id), [products, activeBusiness.id]);
  const activeSales = useMemo(() => sales.filter(s => s.businessId === activeBusiness.id), [sales, activeBusiness.id]);
  const activeExpenses = useMemo(() => expenses.filter(e => e.businessId === activeBusiness.id), [expenses, activeBusiness.id]);
  const activeOtherIncomes = useMemo(() => otherIncomes.filter(oi => oi.businessId === activeBusiness.id), [otherIncomes, activeBusiness.id]);
  const activeCustomers = useMemo(() => customers.filter(c => c.businessId === activeBusiness.id), [customers, activeBusiness.id]);
  const activeSuppliers = useMemo(() => suppliers.filter(s => s.businessId === activeBusiness.id), [suppliers, activeBusiness.id]);
  const activeBudgets = useMemo(() => budgets.filter(b => b.businessId === activeBusiness.id), [budgets, activeBusiness.id]);
  const activeLoans = useMemo(() => loans.filter(l => l.businessId === activeBusiness.id), [loans, activeBusiness.id]);
  const activeCustomerCredits = useMemo(() => customerCredits.filter(cc => cc.businessId === activeBusiness.id), [customerCredits, activeBusiness.id]);
  const activeSupplierPayables = useMemo(() => supplierPayables.filter(sp => sp.businessId === activeBusiness.id), [supplierPayables, activeBusiness.id]);

  const { metrics: brainMetrics, health: brainHealth } = useMemo(() => {
    return VelcoraBusinessBrainEngine.computeDiagnostics({
      products: activeProducts,
      sales: activeSales,
      expenses: activeExpenses,
      otherIncomes: activeOtherIncomes,
      customers: activeCustomers,
      suppliers: activeSuppliers,
    });
  }, [activeProducts, activeSales, activeExpenses, activeOtherIncomes, activeCustomers, activeSuppliers]);

  // Cart actions
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const addToCart = (product: Product, variantId?: string, qty: number = 1) => {
    const variant = variantId ? product.variants.find(v => v.id === variantId) : undefined;
    const unitPrice = variant ? variant.sellingPrice : product.sellingPrice;
    const costPrice = variant ? variant.costPrice : product.costPrice;
    const sku = variant ? variant.sku : product.sku;
    const itemName = variant
      ? `${product.name} (${Object.entries(variant.attributes).map(([k, v]) => `${k}: ${v}`).join(', ')})`
      : product.name;

    setCart(prev => {
      const idx = prev.findIndex(item => item.productId === product.id && item.variantId === variantId);
      if (idx >= 0) {
        const updated = [...prev];
        const newQty = updated[idx].quantity + qty;
        const lineCalc = VelcoraPricingEngine.calculateLineItem(unitPrice, newQty, updated[idx].discount, product.taxRate, product.taxInclusive);
        updated[idx] = {
          ...updated[idx],
          quantity: newQty,
          taxAmount: lineCalc.lineTax,
        };
        return updated;
      } else {
        const lineCalc = VelcoraPricingEngine.calculateLineItem(unitPrice, qty, 0, product.taxRate, product.taxInclusive);
        const newItem: CartItem = {
          productId: product.id,
          variantId,
          name: itemName,
          sku,
          unitPrice,
          costPrice,
          quantity: qty,
          discount: 0,
          discountPercent: 0,
          taxRate: product.taxRate,
          taxAmount: lineCalc.lineTax,
        };
        return [...prev, newItem];
      }
    });
  };

  const removeFromCart = (productId: string, variantId?: string) => {
    setCart(prev => prev.filter(item => !(item.productId === productId && item.variantId === variantId)));
  };

  const updateCartItemQty = (productId: string, variantId: string | undefined, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId, variantId);
      return;
    }
    setCart(prev =>
      prev.map(item => {
        if (item.productId === productId && item.variantId === variantId) {
          const lineCalc = VelcoraPricingEngine.calculateLineItem(item.unitPrice, qty, item.discount, item.taxRate, false);
          return {
            ...item,
            quantity: qty,
            taxAmount: lineCalc.lineTax,
          };
        }
        return item;
      })
    );
  };

  const updateCartItemDiscount = (productId: string, variantId: string | undefined, discountAmount: number) => {
    setCart(prev =>
      prev.map(item => {
        if (item.productId === productId && item.variantId === variantId) {
          const disc = Math.max(0, Math.min(item.unitPrice * item.quantity, discountAmount));
          const lineCalc = VelcoraPricingEngine.calculateLineItem(item.unitPrice, item.quantity, disc, item.taxRate, false);
          return {
            ...item,
            discount: disc,
            discountPercent: item.unitPrice * item.quantity > 0 ? (disc / (item.unitPrice * item.quantity)) * 100 : 0,
            taxAmount: lineCalc.lineTax,
          };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomerId(null);
    setRedeemPoints(0);
  };

  const holdCurrentCart = (label?: string) => {
    if (cart.length === 0) return;
    const holdId = `hold-${Date.now()}`;
    const name = label || (selectedCustomer ? selectedCustomer.name : `Ticket #${heldCarts.length + 1}`);
    setHeldCarts(prev => [{ id: holdId, name, items: [...cart], customerId: selectedCustomerId || undefined, createdAt: new Date().toISOString() }, ...prev]);
    clearCart();
  };

  const resumeHeldCart = (id: string) => {
    const target = heldCarts.find(h => h.id === id);
    if (!target) return;
    setCart(target.items);
    if (target.customerId) setSelectedCustomerId(target.customerId);
    setHeldCarts(prev => prev.filter(h => h.id !== id));
  };

  const deleteHeldCart = (id: string) => {
    setHeldCarts(prev => prev.filter(h => h.id !== id));
  };

  // Stock Adjustment
  const adjustStock = (productId: string, delta: number) => {
    const target = products.find(p => p.id === productId);
    const newStock = Math.max(0, (target?.stock || 0) + delta);
    setProducts(prev =>
      prev.map(p => {
        if (p.id === productId) {
          return { ...p, stock: newStock };
        }
        return p;
      })
    );
    updateDoc(doc(db, 'businesses', activeBusiness.id, 'products', productId), { 
      stock: increment(delta) 
    })
      .catch(err => handleFirestoreError(err, OperationType.UPDATE, `businesses/${activeBusiness.id}/products/${productId}`));
  };

  // Complete Sale
  const completeSale = (payments: PaymentBreakdown[], notes?: string): SaleTransaction => {
    const evaluated = VelcoraPricingEngine.evaluateCart(cart, 0, redeemPoints, loyaltyConfig);
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(sales.length + 101).padStart(4, '0')}-${randomSuffix}`;

    // Calculate Loyalty Points Earned
    const pointsEarned = VelcoraLoyaltyEngine.calculatePointsEarned(
      evaluated.grandTotal,
      cart,
      loyaltyConfig,
      selectedCustomer?.tier
    );

    const newSale: SaleTransaction = {
      id: `sale-tx-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      businessId: activeBusiness.id,
      invoiceNumber,
      customerId: selectedCustomer?.id || null,
      customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in Customer',
      items: [...cart],
      subtotal: evaluated.subtotal,
      discountTotal: evaluated.totalDiscount,
      taxTotal: evaluated.totalTax,
      grandTotal: evaluated.grandTotal,
      costTotal: evaluated.costTotal,
      netProfit: evaluated.grandTotal - evaluated.costTotal - evaluated.totalTax,
      payments,
      balanceRemaining: Math.max(0, evaluated.grandTotal - payments.reduce((acc, p) => acc + p.amount, 0)),
      status: 'completed',
      pointsEarned,
      pointsRedeemed: redeemPoints,
      notes: notes || null,
      cashierName: activeUser.name,
      createdAt: new Date().toISOString(),
      channel: 'pos',
      syncStatus: isOffline ? 'pending' : 'synced',
      isOffline: isOffline,
    };

    // 1. Deduct Stock for each product (locally & cloud)
    cart.forEach(item => {
      adjustStock(item.productId, -item.quantity);
    });

    // 2. Update Customer Loyalty & Purchase Count
    if (selectedCustomer) {
      const newPoints = Math.max(0, selectedCustomer.loyaltyPoints - redeemPoints) + pointsEarned;
      const newSpent = selectedCustomer.totalSpent + evaluated.grandTotal;
      let tier = selectedCustomer.tier;
      if (newSpent >= 4000) tier = 'Platinum Elite';
      else if (newSpent >= 1500) tier = 'Gold VIP';
      else if (newSpent >= 500) tier = 'Silver';

      const customerPatchLocal = {
        loyaltyPoints: newPoints,
        totalSpent: newSpent,
        ordersCount: selectedCustomer.ordersCount + 1,
        tier,
        lastPurchaseDate: new Date().toISOString(),
      };

      const customerPatchDB = {
        loyaltyPoints: increment(pointsEarned - redeemPoints),
        totalSpent: increment(evaluated.grandTotal),
        ordersCount: increment(1),
        tier,
        lastPurchaseDate: new Date().toISOString(),
      };

      setCustomers(prev =>
        prev.map(c => (c.id === selectedCustomer.id ? { ...c, ...customerPatchLocal } : c))
      );
      updateDoc(doc(db, 'businesses', activeBusiness.id, 'customers', selectedCustomer.id), customerPatchDB)
        .catch(err => handleFirestoreError(err, OperationType.UPDATE, `businesses/${activeBusiness.id}/customers/${selectedCustomer.id}`));
    }

    // 3. Append Sale Transaction locally & Cloud Firestore
    setSales(prev => [newSale, ...prev]);
    if (isOffline) {
      setOfflineSalesQueue(prev => [...prev, newSale]);
    } else {
      setDoc(doc(db, 'businesses', activeBusiness.id, 'sales', newSale.id), cleanObjectForFirestore(newSale))
        .catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `businesses/${activeBusiness.id}/sales/${newSale.id}`);
          // If Firestore write fails, put it in the offline queue as fallback
          setOfflineSalesQueue(prev => [...prev, { ...newSale, syncStatus: 'pending', isOffline: true }]);
        });
    }

    // 4. Clear POS
    clearCart();

    // 5. Telemetry Activity Dispatch
    logSystemActivity({
      type: 'TRANSACTION',
      action: 'POS_SALE_COMPLETED',
      businessId: activeBusiness.id,
      userId: activeUser.id,
      details: `POS Sale ${invoiceNumber} completed for $${evaluated.grandTotal.toFixed(2)} (${newSale.items.length} items)`,
      metadata: {
        invoiceNumber,
        grandTotal: evaluated.grandTotal,
        itemCount: newSale.items.length,
        customerName: newSale.customerName,
      },
    });

    return newSale;
  };

  // Process Sale Return or Exchange
  const processSaleReturnOrExchange = async (params: {
    saleId: string;
    type: 'return' | 'exchange';
    returnedItems: { productId: string; variantId?: string; name: string; quantity: number; refundUnitPrice: number }[];
    exchangeItems?: { productId: string; variantId?: string; name: string; quantity: number; unitPrice: number }[];
    refundMethod: 'cash' | 'card' | 'store_credit';
    reason?: string;
  }): Promise<{ success: boolean; creditNote?: CreditNote; message?: string }> => {
    const originalSale = sales.find(s => s.id === params.saleId);
    if (!originalSale) return { success: false, message: 'Original invoice not found' };

    const returnSubtotal = params.returnedItems.reduce((acc, it) => acc + (it.refundUnitPrice * it.quantity), 0);
    const exchangeSubtotal = (params.exchangeItems || []).reduce((acc, it) => acc + (it.unitPrice * it.quantity), 0);
    const netRefundAmount = Math.max(0, returnSubtotal - exchangeSubtotal);

    // 1. Restock returned items
    params.returnedItems.forEach(it => {
      adjustStock(it.productId, it.quantity);
    });

    // 2. Deduct exchanged items from stock
    (params.exchangeItems || []).forEach(it => {
      adjustStock(it.productId, -it.quantity);
    });

    // 3. Create a Credit Note record
    const cnNumber = `CN-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    const creditNote: CreditNote = {
      id: `cn-${Date.now()}`,
      businessId: activeBusiness.id,
      creditNoteNumber: cnNumber,
      originalInvoiceNumber: originalSale.invoiceNumber,
      customerId: originalSale.customerId || 'walk-in',
      customerName: originalSale.customerName || 'Walk-in Customer',
      reason: params.reason || (params.type === 'exchange' ? 'Item Exchange' : 'Customer Return & Refund'),
      items: params.returnedItems.map(it => ({
        productId: it.productId,
        name: it.name,
        quantity: it.quantity,
        amount: it.refundUnitPrice * it.quantity,
      })),
      amount: returnSubtotal,
      status: params.type === 'exchange' ? 'applied' : (params.refundMethod === 'store_credit' ? 'active' : 'refunded'),
      createdAt: new Date().toISOString(),
    };
    addCreditNote(creditNote);

    // 4. Update customer balance if store credit
    if (originalSale.customerId) {
      const cust = customers.find(c => c.id === originalSale.customerId);
      if (cust && params.refundMethod === 'store_credit' && netRefundAmount > 0) {
        const updatedBal = Math.max(0, (cust.outstandingBalance || 0) - netRefundAmount);
        updateCustomer(cust.id, { outstandingBalance: updatedBal });
      }
    }

    // 5. Update original sale transaction
    const returnRecord: SaleReturnRecord = {
      returnedAt: new Date().toISOString(),
      type: params.type,
      returnedItems: params.returnedItems,
      exchangeItems: params.exchangeItems || [],
      refundAmount: netRefundAmount,
      refundMethod: params.refundMethod,
      creditNoteNumber: cnNumber,
      reason: params.reason,
      processedBy: activeUser.name,
    };

    const currentReturnHistory = originalSale.returnHistory || [];
    const updatedReturnHistory = [...currentReturnHistory, returnRecord];
    const totalRefunded = (originalSale.refundedAmount || 0) + netRefundAmount;
    const isFullyRefunded = totalRefunded >= originalSale.grandTotal;
    const newStatus = isFullyRefunded ? 'returned' : (params.type === 'exchange' ? originalSale.status : 'partial');

    const updatedSale: SaleTransaction = {
      ...originalSale,
      status: newStatus,
      refundedAmount: totalRefunded,
      returnHistory: updatedReturnHistory,
    };

    setSales(prev => prev.map(s => s.id === params.saleId ? updatedSale : s));
    updateDoc(doc(db, 'businesses', activeBusiness.id, 'sales', params.saleId), {
      status: newStatus,
      refundedAmount: totalRefunded,
      returnHistory: updatedReturnHistory,
    }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `businesses/${activeBusiness.id}/sales/${params.saleId}`));

    return { success: true, creditNote };
  };

  // Online Store Order Processing
  const submitOnlineStoreOrder = (orderData: Omit<OnlineStoreOrder, 'id' | 'businessId' | 'orderNumber' | 'createdAt'>): OnlineStoreOrder => {
    const newOrder: OnlineStoreOrder = {
      ...orderData,
      id: `ord-on-${Date.now()}`,
      businessId: activeBusiness.id,
      orderNumber: `WEB-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
    };

    // Deduct stock
    orderData.items.forEach(item => {
      adjustStock(item.productId, -item.quantity);
    });

    setOnlineOrders(prev => [newOrder, ...prev]);

    // Create smart alert
    setSmartAlerts(prev => [
      {
        id: `alert-${Date.now()}`,
        type: 'SUCCESS',
        title: `New Online Order: ${newOrder.orderNumber}`,
        message: `${newOrder.customerName} placed an order for $${newOrder.totalAmount.toFixed(2)} (${newOrder.paymentMethod}).`,
        timestamp: new Date().toISOString(),
        read: false,
        actionRoute: 'online_store',
      },
      ...prev,
    ]);

    return newOrder;
  };

  const updateActiveBusiness = (patch: Partial<BusinessProfile>) => {
    setBusinesses(prev =>
      prev.map(b => (b.id === activeBusiness.id ? { ...b, ...patch } : b))
    );
    updateDoc(doc(db, 'businesses', activeBusiness.id), patch)
      .catch(err => handleFirestoreError(err, OperationType.UPDATE, `businesses/${activeBusiness.id}`));
  };

  const addNewBusiness = (biz: BusinessProfile) => {
    setBusinesses(prev => [...prev, biz]);
    setActiveBusinessId(biz.id);
    setLocale(biz.language);
    setCurrency(biz.currency);
    setDoc(doc(db, 'businesses', biz.id), biz)
      .catch(err => handleFirestoreError(err, OperationType.WRITE, `businesses/${biz.id}`));
  };

  const addProduct = (p: Product) => {
    setProducts(prev => [p, ...prev]);
    setDoc(doc(db, 'businesses', activeBusiness.id, 'products', p.id), cleanObjectForFirestore({ ...p, businessId: activeBusiness.id }))
      .catch(err => handleFirestoreError(err, OperationType.WRITE, `businesses/${activeBusiness.id}/products/${p.id}`));
  };

  const updateProduct = (id: string, patch: Partial<Product>) => {
    setProducts(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
    updateDoc(doc(db, 'businesses', activeBusiness.id, 'products', id), cleanObjectForFirestore(patch))
      .catch(err => handleFirestoreError(err, OperationType.UPDATE, `businesses/${activeBusiness.id}/products/${id}`));
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    deleteDoc(doc(db, 'businesses', activeBusiness.id, 'products', id))
      .catch(err => handleFirestoreError(err, OperationType.DELETE, `businesses/${activeBusiness.id}/products/${id}`));
  };

  const addCustomer = (c: Customer) => {
    const nextSeq = 1000 + customers.length + 1;
    const generatedCustNum = c.customerNumber || `CUST-${nextSeq}`;
    const preparedCust: Customer = {
      ...c,
      businessId: activeBusiness.id,
      customerNumber: generatedCustNum,
      barcode: c.barcode || generatedCustNum,
      qrCode: c.qrCode || generatedCustNum,
      phone: c.phone?.trim() || undefined,
      email: c.email?.trim() || undefined,
    };
    setCustomers(prev => [preparedCust, ...prev]);
    setDoc(doc(db, 'businesses', activeBusiness.id, 'customers', preparedCust.id), cleanObjectForFirestore(preparedCust))
      .catch(err => handleFirestoreError(err, OperationType.WRITE, `businesses/${activeBusiness.id}/customers/${preparedCust.id}`));
  };

  const updateCustomer = (id: string, patch: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));
    updateDoc(doc(db, 'businesses', activeBusiness.id, 'customers', id), cleanObjectForFirestore(patch))
      .catch(err => handleFirestoreError(err, OperationType.UPDATE, `businesses/${activeBusiness.id}/customers/${id}`));
  };

  const deleteCustomer = (id: string) => {
    if (selectedCustomerId === id) {
      setSelectedCustomerId(null);
      setRedeemPoints(0);
    }
    setCustomers(prev => prev.filter(c => c.id !== id));
    deleteDoc(doc(db, 'businesses', activeBusiness.id, 'customers', id))
      .catch(err => handleFirestoreError(err, OperationType.DELETE, `businesses/${activeBusiness.id}/customers/${id}`));
  };

  const addSupplier = (s: Supplier) => {
    setSuppliers(prev => [s, ...prev]);
    setDoc(doc(db, 'businesses', activeBusiness.id, 'suppliers', s.id), cleanObjectForFirestore({ ...s, businessId: activeBusiness.id }))
      .catch(err => handleFirestoreError(err, OperationType.WRITE, `businesses/${activeBusiness.id}/suppliers/${s.id}`));
  };

  const updateSupplier = (id: string, patch: Partial<Supplier>) => {
    setSuppliers(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
    updateDoc(doc(db, 'businesses', activeBusiness.id, 'suppliers', id), cleanObjectForFirestore(patch))
      .catch(err => handleFirestoreError(err, OperationType.UPDATE, `businesses/${activeBusiness.id}/suppliers/${id}`));
  };

  const deleteSupplier = (id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
    deleteDoc(doc(db, 'businesses', activeBusiness.id, 'suppliers', id))
      .catch(err => handleFirestoreError(err, OperationType.DELETE, `businesses/${activeBusiness.id}/suppliers/${id}`));
  };

  const addPurchaseOrder = (po: PurchaseOrder) => {
    setPurchaseOrders(prev => [po, ...prev]);
    setDoc(doc(db, 'businesses', activeBusiness.id, 'purchaseOrders', po.id), cleanObjectForFirestore({ ...po, businessId: activeBusiness.id }))
      .catch(err => handleFirestoreError(err, OperationType.WRITE, `businesses/${activeBusiness.id}/purchaseOrders/${po.id}`));
  };

  const receivePurchaseOrder = (poId: string) => {
    setPurchaseOrders(prev =>
      prev.map(po => {
        if (po.id === poId) {
          po.items.forEach(item => {
            adjustStock(item.productId, item.quantityOrdered);
          });
          const patch = { status: 'received' as const, amountPaid: po.totalAmount };
          updateDoc(doc(db, 'businesses', activeBusiness.id, 'purchaseOrders', poId), cleanObjectForFirestore(patch))
            .catch(err => handleFirestoreError(err, OperationType.UPDATE, `businesses/${activeBusiness.id}/purchaseOrders/${poId}`));
          return { ...po, ...patch };
        }
        return po;
      })
    );
  };

  const addSaleOrder = (so: SaleOrder) => {
    setSaleOrders(prev => [so, ...prev]);
    setDoc(doc(db, 'businesses', activeBusiness.id, 'saleOrders', so.id), cleanObjectForFirestore({ ...so, businessId: activeBusiness.id }))
      .catch(err => handleFirestoreError(err, OperationType.WRITE, `businesses/${activeBusiness.id}/saleOrders/${so.id}`));
  };

  const addEstimate = (est: Estimate) => {
    setEstimates(prev => [est, ...prev]);
    setDoc(doc(db, 'businesses', activeBusiness.id, 'estimates', est.id), cleanObjectForFirestore({ ...est, businessId: activeBusiness.id }))
      .catch(err => handleFirestoreError(err, OperationType.WRITE, `businesses/${activeBusiness.id}/estimates/${est.id}`));
  };

  const addCreditNote = (cn: CreditNote) => {
    setCreditNotes(prev => [cn, ...prev]);
    setDoc(doc(db, 'businesses', activeBusiness.id, 'creditNotes', cn.id), cleanObjectForFirestore({ ...cn, businessId: activeBusiness.id }))
      .catch(err => handleFirestoreError(err, OperationType.WRITE, `businesses/${activeBusiness.id}/creditNotes/${cn.id}`));
  };

  const addDeliveryNote = (dn: DeliveryNote) => {
    setDeliveryNotes(prev => [dn, ...prev]);
    setDoc(doc(db, 'businesses', activeBusiness.id, 'deliveryNotes', dn.id), cleanObjectForFirestore({ ...dn, businessId: activeBusiness.id }))
      .catch(err => handleFirestoreError(err, OperationType.WRITE, `businesses/${activeBusiness.id}/deliveryNotes/${dn.id}`));
  };

  const addExpense = (exp: Expense) => {
    setExpenses(prev => [exp, ...prev]);
    setDoc(doc(db, 'businesses', activeBusiness.id, 'expenses', exp.id), cleanObjectForFirestore({ ...exp, businessId: activeBusiness.id }))
      .catch(err => handleFirestoreError(err, OperationType.WRITE, `businesses/${activeBusiness.id}/expenses/${exp.id}`));
  };

  const updateExpense = (id: string, patch: Partial<Expense>) => {
    setExpenses(prev => prev.map(e => (e.id === id ? { ...e, ...patch } : e)));
    updateDoc(doc(db, 'businesses', activeBusiness.id, 'expenses', id), cleanObjectForFirestore(patch))
      .catch(err => handleFirestoreError(err, OperationType.UPDATE, `businesses/${activeBusiness.id}/expenses/${id}`));
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    deleteDoc(doc(db, 'businesses', activeBusiness.id, 'expenses', id))
      .catch(err => handleFirestoreError(err, OperationType.DELETE, `businesses/${activeBusiness.id}/expenses/${id}`));
  };

  const addOtherIncome = (oi: OtherIncome) => {
    setOtherIncomes(prev => [oi, ...prev]);
    setDoc(doc(db, 'businesses', activeBusiness.id, 'otherIncomes', oi.id), cleanObjectForFirestore({ ...oi, businessId: activeBusiness.id }))
      .catch(err => handleFirestoreError(err, OperationType.WRITE, `businesses/${activeBusiness.id}/otherIncomes/${oi.id}`));
  };

  const updateOtherIncome = (id: string, patch: Partial<OtherIncome>) => {
    setOtherIncomes(prev => prev.map(oi => (oi.id === id ? { ...oi, ...patch } : oi)));
    updateDoc(doc(db, 'businesses', activeBusiness.id, 'otherIncomes', id), cleanObjectForFirestore(patch))
      .catch(err => handleFirestoreError(err, OperationType.UPDATE, `businesses/${activeBusiness.id}/otherIncomes/${id}`));
  };

  const deleteOtherIncome = (id: string) => {
    setOtherIncomes(prev => prev.filter(oi => oi.id !== id));
    deleteDoc(doc(db, 'businesses', activeBusiness.id, 'otherIncomes', id))
      .catch(err => handleFirestoreError(err, OperationType.DELETE, `businesses/${activeBusiness.id}/otherIncomes/${id}`));
  };

  const addBudget = (b: Budget) => {
    setBudgets(prev => [b, ...prev]);
    setDoc(doc(db, 'businesses', activeBusiness.id, 'budgets', b.id), cleanObjectForFirestore({ ...b, businessId: activeBusiness.id }))
      .catch(err => handleFirestoreError(err, OperationType.WRITE, `businesses/${activeBusiness.id}/budgets/${b.id}`));
  };

  const updateBudget = (id: string, patch: Partial<Budget>) => {
    setBudgets(prev => prev.map(b => (b.id === id ? { ...b, ...patch } : b)));
    updateDoc(doc(db, 'businesses', activeBusiness.id, 'budgets', id), cleanObjectForFirestore(patch))
      .catch(err => handleFirestoreError(err, OperationType.UPDATE, `businesses/${activeBusiness.id}/budgets/${id}`));
  };

  const deleteBudget = (id: string) => {
    setBudgets(prev => prev.filter(b => b.id !== id));
    deleteDoc(doc(db, 'businesses', activeBusiness.id, 'budgets', id))
      .catch(err => handleFirestoreError(err, OperationType.DELETE, `businesses/${activeBusiness.id}/budgets/${id}`));
  };

  const addLoan = (l: Loan) => {
    setLoans(prev => [l, ...prev]);
    setDoc(doc(db, 'businesses', activeBusiness.id, 'loans', l.id), cleanObjectForFirestore({ ...l, businessId: activeBusiness.id }))
      .catch(err => handleFirestoreError(err, OperationType.WRITE, `businesses/${activeBusiness.id}/loans/${l.id}`));
  };

  const updateLoan = (id: string, patch: Partial<Loan>) => {
    setLoans(prev => prev.map(l => (l.id === id ? { ...l, ...patch } : l)));
    updateDoc(doc(db, 'businesses', activeBusiness.id, 'loans', id), cleanObjectForFirestore(patch))
      .catch(err => handleFirestoreError(err, OperationType.UPDATE, `businesses/${activeBusiness.id}/loans/${id}`));
  };

  const deleteLoan = (id: string) => {
    setLoans(prev => prev.filter(l => l.id !== id));
    deleteDoc(doc(db, 'businesses', activeBusiness.id, 'loans', id))
      .catch(err => handleFirestoreError(err, OperationType.DELETE, `businesses/${activeBusiness.id}/loans/${id}`));
  };

  const addLoanPayment = (loanId: string, payment: Omit<LoanPayment, 'id'>) => {
    const newPay: LoanPayment = {
      ...payment,
      id: `lpay-${Date.now()}` as any
    };
    setLoans(prev => prev.map(l => {
      if (l.id === loanId) {
        const nextPayments = [...l.payments, newPay];
        const nextAmountPaid = nextPayments.reduce((sum, p) => sum + p.amount, 0);
        const nextStatus = nextAmountPaid >= l.amount ? 'Paid' : nextAmountPaid > 0 ? 'Partially Paid' : 'Active';
        return {
          ...l,
          payments: nextPayments,
          amountPaid: nextAmountPaid,
          status: nextStatus
        };
      }
      return l;
    }));
  };

  const addCustomerCredit = (cc: CustomerCredit) => {
    setCustomerCredits(prev => [cc, ...prev]);
    setDoc(doc(db, 'businesses', activeBusiness.id, 'customerCredits', cc.id), cleanObjectForFirestore({ ...cc, businessId: activeBusiness.id }))
      .catch(err => handleFirestoreError(err, OperationType.WRITE, `businesses/${activeBusiness.id}/customerCredits/${cc.id}`));
    
    // Also update customer outstandingBalance
    updateCustomer(cc.customerId, { outstandingBalance: cc.remainingBalance });
  };

  const recordCustomerCreditPayment = (creditId: string, payment: Omit<CustomerCreditPayment, 'id'>) => {
    const newPay: CustomerCreditPayment = {
      ...payment,
      id: `ccpay-${Date.now()}` as any
    };
    setCustomerCredits(prev => prev.map(cc => {
      if (cc.id === creditId) {
        const nextPayments = [...cc.payments, newPay];
        const nextAmountPaid = nextPayments.reduce((sum, p) => sum + p.amount, 0);
        const nextRemaining = cc.totalAmount - nextAmountPaid;
        
        // Update customer outstandingBalance
        updateCustomer(cc.customerId, { outstandingBalance: nextRemaining });

        return {
          ...cc,
          payments: nextPayments,
          amountPaid: nextAmountPaid,
          remainingBalance: nextRemaining
        };
      }
      return cc;
    }));
  };

  const addSupplierPayable = (sp: SupplierPayable) => {
    setSupplierPayables(prev => [sp, ...prev]);
    setDoc(doc(db, 'businesses', activeBusiness.id, 'supplierPayables', sp.id), cleanObjectForFirestore({ ...sp, businessId: activeBusiness.id }))
      .catch(err => handleFirestoreError(err, OperationType.WRITE, `businesses/${activeBusiness.id}/supplierPayables/${sp.id}`));
    
    // Also update supplier balanceOwed
    updateSupplier(sp.supplierId, { balanceOwed: sp.remainingBalance });
  };

  const recordSupplierPayablePayment = (payableId: string, payment: Omit<SupplierPayablePayment, 'id'>) => {
    const newPay: SupplierPayablePayment = {
      ...payment,
      id: `sppay-${Date.now()}` as any
    };
    setSupplierPayables(prev => prev.map(sp => {
      if (sp.id === payableId) {
        const nextPayments = [...sp.payments, newPay];
        const nextAmountPaid = nextPayments.reduce((sum, p) => sum + p.amount, 0);
        const nextRemaining = sp.totalAmount - nextAmountPaid;

        // Update supplier balanceOwed
        updateSupplier(sp.supplierId, { balanceOwed: nextRemaining });

        return {
          ...sp,
          payments: nextPayments,
          amountPaid: nextAmountPaid,
          remainingBalance: nextRemaining
        };
      }
      return sp;
    }));
  };

  const addBusinessGoal = (goal: BusinessGoal) => setBusinessGoals(prev => [goal, ...prev]);
  const updateBusinessGoal = (id: string, patch: Partial<BusinessGoal>) => {
    setBusinessGoals(prev => prev.map(g => (g.id === id ? { ...g, ...patch } : g)));
  };

  const dismissAlert = (id: string) => {
    setSmartAlerts(prev => prev.filter(a => a.id !== id));
  };

  // Workstation Device Authorization & Control
  const authorizeWorkstation = (id: string) => {
    const patch: Partial<Workstation> = {
      isAuthorized: true,
      status: 'online',
      revokedAt: null,
    };
    setWorkstations(prev => prev.map(w => (w.id === id || w.deviceId === id ? { ...w, ...patch } : w)));
    updateDoc(doc(db, 'businesses', activeBusiness.id, 'workstations', id), patch)
      .catch(err => handleFirestoreError(err, OperationType.UPDATE, `businesses/${activeBusiness.id}/workstations/${id}`));
  };

  const revokeWorkstation = (id: string) => {
    const patch: Partial<Workstation> = {
      isAuthorized: false,
      status: 'locked',
      revokedAt: new Date().toISOString(),
    };
    setWorkstations(prev => prev.map(w => (w.id === id || w.deviceId === id ? { ...w, ...patch } : w)));
    updateDoc(doc(db, 'businesses', activeBusiness.id, 'workstations', id), patch)
      .catch(err => handleFirestoreError(err, OperationType.UPDATE, `businesses/${activeBusiness.id}/workstations/${id}`));
  };

  // Full Backup Restoration Engine
  const restoreBackupData = async (backupData: any): Promise<{ success: boolean; count: number; error?: string }> => {
    if (!backupData || typeof backupData !== 'object') {
      return { success: false, count: 0, error: 'Invalid backup JSON file structure.' };
    }
    try {
      let restoredCount = 0;
      const bizId = activeBusiness.id;

      // Restore Products
      if (Array.isArray(backupData.products)) {
        for (const p of backupData.products) {
          if (p.id && p.name) {
            await setDoc(doc(db, 'businesses', bizId, 'products', p.id), { ...p, businessId: bizId });
            restoredCount++;
          }
        }
      }

      // Restore Customers
      if (Array.isArray(backupData.customers)) {
        for (const c of backupData.customers) {
          if (c.id && c.name) {
            await setDoc(doc(db, 'businesses', bizId, 'customers', c.id), { ...c, businessId: bizId });
            restoredCount++;
          }
        }
      }

      // Restore Sales
      const salesArr = backupData.salesHistory || backupData.sales;
      if (Array.isArray(salesArr)) {
        for (const s of salesArr) {
          if (s.id && s.grandTotal !== undefined) {
            await setDoc(doc(db, 'businesses', bizId, 'sales', s.id), { ...s, businessId: bizId });
            restoredCount++;
          }
        }
      }

      // Restore Expenses
      if (Array.isArray(backupData.expenses)) {
        for (const e of backupData.expenses) {
          if (e.id && e.amount !== undefined) {
            await setDoc(doc(db, 'businesses', bizId, 'expenses', e.id), { ...e, businessId: bizId });
            restoredCount++;
          }
        }
      }

      return { success: true, count: restoredCount };
    } catch (err: any) {
      console.error('Failed to restore backup data:', err);
      return { success: false, count: 0, error: err.message || 'Error writing backup records to Firestore.' };
    }
  };

  // Subuser & Role CRUD Handlers
  const addSubuser = (user: SubUser) => {
    setSubusers(prev => [...prev, user]);
    setDoc(doc(db, 'businesses', activeBusiness.id, 'subusers', user.id), { ...user, businessId: activeBusiness.id })
      .catch(err => handleFirestoreError(err, OperationType.WRITE, `businesses/${activeBusiness.id}/subusers/${user.id}`));
  };

  const updateSubuser = (id: string, patch: Partial<SubUser>) => {
    setSubusers(prev => prev.map(u => (u.id === id ? { ...u, ...patch } : u)));
    if (activeUser.id === id) {
      setActiveUser(prev => ({ ...prev, ...patch }));
    }
    updateDoc(doc(db, 'businesses', activeBusiness.id, 'subusers', id), patch)
      .catch(err => handleFirestoreError(err, OperationType.UPDATE, `businesses/${activeBusiness.id}/subusers/${id}`));
  };

  const deleteSubuser = (id: string) => {
    setSubusers(prev => prev.filter(u => u.id !== id));
    deleteDoc(doc(db, 'businesses', activeBusiness.id, 'subusers', id))
      .catch(err => handleFirestoreError(err, OperationType.DELETE, `businesses/${activeBusiness.id}/subusers/${id}`));
  };

  const addRole = (role: UserRole) => {
    setRoles(prev => [...prev, role]);
    setDoc(doc(db, 'businesses', activeBusiness.id, 'roles', role.id), role)
      .catch(err => handleFirestoreError(err, OperationType.WRITE, `businesses/${activeBusiness.id}/roles/${role.id}`));
  };

  const updateRole = (id: string, patch: Partial<UserRole>) => {
    setRoles(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
    if (patch.name) {
      setSubusers(prev => prev.map(u => (u.roleId === id ? { ...u, roleName: patch.name! } : u)));
    }
    updateDoc(doc(db, 'businesses', activeBusiness.id, 'roles', id), patch)
      .catch(err => handleFirestoreError(err, OperationType.UPDATE, `businesses/${activeBusiness.id}/roles/${id}`));
  };
  const deleteRole = (id: string) => {
    setRoles(prev => prev.filter(r => r.id !== id));
  };

  const hasPermission = (permission: PermissionKey): boolean => {
    if (!activeUser) return true;
    const userRole = roles.find(r => r.id === activeUser.roleId);
    if (!userRole) return true;
    return userRole.permissions.includes(permission);
  };

  const completeOnboarding = (config: {
    businessName: string;
    industry: IndustryType;
    businessModel?: 'product' | 'service' | 'hybrid';
    industryCategory?: 'retail' | 'beauty' | 'healthcare' | 'food' | 'automotive' | 'education' | 'professional' | 'other';
    primaryColor?: string;
    country?: string;
    currency: CurrencyCode;
    language: LocaleCode;
    enabledModules: SystemModuleKey[];
    taxRate: number;
    taxInclusive: boolean;
    initialRoleName?: string;
  }) => {
    const newBizId = `biz-${config.industry}-${Date.now().toString().slice(-4)}`;
    const currencySymbols: Record<string, string> = {
      USD: '$', PKR: 'Rs.', EUR: '€', GBP: '£', AED: 'AED', SAR: 'SAR', INR: '₹', CAD: 'CA$', AUD: 'AU$'
    };

    const newBiz: BusinessProfile = {
      id: newBizId,
      name: config.businessName,
      legalName: `${config.businessName} Ltd.`,
      industry: config.industry,
      businessModel: config.businessModel || 'product',
      industryCategory: config.industryCategory || 'retail',
      primaryColor: config.primaryColor || '#5B5CE2',
      country: config.country || 'United States',
      currency: config.currency,
      currencySymbol: currencySymbols[config.currency] || '$',
      language: config.language,
      taxRateDefault: config.taxRate / 100,
      taxInclusive: config.taxInclusive,
      phone: '+1 (555) 234-5678',
      email: `contact@${config.businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      address: '742 Evergreen Terrace, Suite 100',
      receiptHeader: `*** ${config.businessName.toUpperCase()} ***\nThank you for your business!`,
      receiptFooter: 'Visit us again or order online at velcora.shop',
      enabledModules: config.enabledModules,
      customFields: [],
      createdAt: new Date().toISOString(),
    };

    setBusinesses(prev => [newBiz, ...prev.filter(b => b.id !== newBizId)]);
    setActiveBusinessId(newBizId);
    setLocale(config.language);
    setCurrency(config.currency);
    setPrimaryColor(config.primaryColor || '#5B5CE2');
    setHasCompletedOnboarding(true);
    setIsOnboardingOpen(false);
    try {
      localStorage.setItem('velcora_onboarding_completed', 'true');
      localStorage.setItem('velcora_active_business_id', newBizId);
      setDoc(doc(db, 'businesses', newBizId), cleanObjectForFirestore(newBiz))
        .catch(err => console.warn('Firestore offline sync pending:', err));
      if (authUser) {
        setDoc(doc(db, 'users', authUser.uid), {
          hasCompletedOnboarding: true,
          ownerBusinessId: newBizId,
          authorizedBusinessIds: arrayUnion(newBizId),
          updatedAt: new Date().toISOString(),
        }, { merge: true }).catch(() => {});
      }
    } catch {}
    // Switch to POS / Dashboard
    setCurrentModule('business_brain');
    setActiveMode('business');
  };

  const updateLoyaltyConfig = (cfg: Partial<LoyaltyRuleConfig>) => {
    setLoyaltyConfig(prev => ({ ...prev, ...cfg }));
  };

  const convertEstimateToSale = (estimateId: string) => {
    const est = estimates.find(e => e.id === estimateId);
    if (!est) return;
    const saleTx: SaleTransaction = {
      id: `sale-from-est-${Date.now().toString().slice(-4)}`,
      businessId: est.businessId,
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      customerId: est.customerId,
      customerName: est.customerName,
      items: est.items,
      subtotal: est.subtotal,
      discountTotal: est.discountTotal,
      taxTotal: est.taxTotal,
      grandTotal: est.grandTotal,
      costTotal: est.grandTotal * 0.55,
      netProfit: est.grandTotal * 0.45,
      payments: [{ method: 'cash', amount: est.grandTotal, paidAt: new Date().toISOString() }],
      balanceRemaining: 0,
      status: 'completed',
      pointsEarned: 0,
      pointsRedeemed: 0,
      cashierName: activeUser.name,
      createdAt: new Date().toISOString(),
      channel: 'manual_invoice',
    };
    setSales(prev => [saleTx, ...prev]);
    setEstimates(prev => prev.map(e => e.id === estimateId ? { ...e, status: 'converted' } : e));
  };

  // ----------------------------------------------------
  // VELCORA REFERRAL, ATTRIBUTION & COMMISSION LOGIC
  // ----------------------------------------------------
  const [referralConfig, setReferralConfig] = useState<ReferralConfig | null>(null);
  const [activeReferralCode, setActiveReferralCode] = useState<string | null>(() => {
    try {
      return localStorage.getItem('velcora_ref_attribution_code') || null;
    } catch {
      return null;
    }
  });
  const [partnerProfile, setPartnerProfile] = useState<ReferralPartner | null>(null);
  const [partnerDashboard, setPartnerDashboard] = useState<ReferralPartnerStats | null>(null);
  const [adminReferralOverview, setAdminReferralOverview] = useState<any | null>(null);
  const [referralLoading, setReferralLoading] = useState<boolean>(false);
  const [referralError, setReferralError] = useState<string | null>(null);

  const isReferralCodeApplied = useMemo(() => !!activeReferralCode, [activeReferralCode]);

  // Headers helper for server API calls
  const getAuthHeaders = () => {
    const isOwnerOrAdmin =
      activeUser.roleId === 'role-owner' ||
      activeUser.roleName.toLowerCase().includes('owner') ||
      activeUser.roleName.toLowerCase().includes('admin') ||
      activeUser.roleName.toLowerCase().includes('manager');

    const adminToken = typeof window !== 'undefined' ? localStorage.getItem('velcora_admin_jwt') : null;

    return {
      'Content-Type': 'application/json',
      ...(adminToken ? { 'Authorization': `Bearer ${adminToken}` } : {}),
      'x-user-id': activeUser.id || 'user-01',
      'x-user-role': isOwnerOrAdmin ? 'ADMIN' : 'USER',
      'x-user-email': activeUser.email || 'alexander@velcora.com',
      'x-user-name': activeUser.name || 'Alexander Vance',
    };
  };

  // Fetch initial config and check URL for ?ref= parameter
  useEffect(() => {
    const initReferrals = async () => {
      try {
        const res = await fetch(getApiUrl('/api/referral/config'));
        if (res.ok) {
          const data = await res.json();
          if (data.config) {
            setReferralConfig(data.config);
          }
        }
      } catch (err) {
        console.warn('Notice loading referral config:', err);
      }

      // Check URL parameters for ?ref=VELxxxxxx or ?referral=VELxxxxxx
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const refParam = searchParams.get('ref') || searchParams.get('referral');
        if (refParam) {
          const cleanCode = refParam.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
          if (/^VEL\d{6}$/.test(cleanCode)) {
            // Validate code with server
            const valRes = await fetch(getApiUrl('/api/referral/validate-code'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: cleanCode }),
            });
            const valData = await valRes.json();
            if (valData.valid && valData.code) {
              setActiveReferralCode(valData.code);
              localStorage.setItem('velcora_ref_attribution_code', valData.code);

              // Record attribution
              await fetch(getApiUrl('/api/referral/track-attribution'), {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                  referralCode: valData.code,
                  referredUserId: activeUser.id || 'usr-guest-' + Date.now().toString().slice(-4),
                  referredUserEmail: activeUser.email,
                  source: 'url_param',
                }),
              });
            }
          }
        }
      } catch (err) {
        console.warn('Notice parsing referral URL parameter:', err);
      }
    };

    initReferrals();
  }, [activeUser.id]);

  const fetchPartnerStatus = async () => {
    try {
      setReferralLoading(true);
      const res = await fetch(getApiUrl('/api/referral/my-partner-status'), {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success && data.partner) {
        setPartnerProfile(data.partner);
        if (data.partner.status === 'ACTIVE') {
          await fetchPartnerDashboard();
        }
      } else {
        setPartnerProfile(null);
      }
    } catch (err: any) {
      console.warn('Fetch partner status notice:', err);
    } finally {
      setReferralLoading(false);
    }
  };

  const fetchPartnerDashboard = async () => {
    try {
      setReferralLoading(true);
      const res = await fetch(getApiUrl('/api/referral/my-dashboard'), {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success && data.dashboard) {
        setPartnerDashboard(data.dashboard);
      }
    } catch (err: any) {
      console.warn('Fetch partner dashboard notice:', err);
    } finally {
      setReferralLoading(false);
    }
  };

  const fetchAdminReferralOverview = async () => {
    try {
      setReferralLoading(true);
      const res = await fetch(getApiUrl('/api/admin/referrals'), {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setAdminReferralOverview(data);
        if (data.config) {
          setReferralConfig(data.config);
        }
      }
    } catch (err: any) {
      console.warn('Fetch admin referral overview notice:', err);
    } finally {
      setReferralLoading(false);
    }
  };

  const validateReferralCode = async (code: string): Promise<{ valid: boolean; code?: string; message?: string }> => {
    try {
      const clean = (code || '').trim().toUpperCase();
      if (!clean) return { valid: false, message: 'Please enter a referral code.' };

      // 1. Direct real-time check in Cloud Firestore
      try {
        const codeRef = doc(db, 'referral_codes', clean);
        const codeSnap = await getDoc(codeRef);
        if (codeSnap.exists()) {
          const cData = codeSnap.data();
          if (cData.status === 'ACTIVE') {
            return {
              valid: true,
              code: clean,
              message: `Referral code "${clean}" verified!`,
            };
          } else {
            return { valid: false, message: 'This referral code is currently inactive or suspended.' };
          }
        }
      } catch (fsErr) {
        console.warn('Firestore referral validation note:', fsErr);
      }

      // 2. Fallback check via API endpoint
      try {
        const res = await fetch(getApiUrl('/api/referral/validate-code'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: clean }),
        });
        if (res.ok) {
          const data = await res.json();
          return {
            valid: !!data.valid,
            code: data.code || clean,
            message: data.message || (data.valid ? 'Referral code verified' : 'Invalid referral code'),
          };
        }
      } catch {}

      // Fallback format validation if offline
      if (/^VEL[0-9A-Z]{3,10}$/i.test(clean)) {
        return { valid: true, code: clean, message: 'Referral code recognized.' };
      }

      return { valid: false, message: 'Referral code not found in directory.' };
    } catch (err: any) {
      return { valid: false, message: err?.message || 'Failed to validate referral code' };
    }
  };

  const applyReferralCode = async (code: string): Promise<{ valid: boolean; message: string }> => {
    const val = await validateReferralCode(code);
    if (val.valid && val.code) {
      setActiveReferralCode(val.code);
      try {
        localStorage.setItem('velcora_ref_attribution_code', val.code);
      } catch {}

      // Direct real-time lead creation in Cloud Firestore
      try {
        const codeRef = doc(db, 'referral_codes', val.code);
        const codeSnap = await getDoc(codeRef);
        const cData = codeSnap.exists() ? codeSnap.data() : null;

        await addDoc(collection(db, 'referral_leads'), {
          referralCode: val.code,
          promoterId: cData?.promoterId || '',
          promoterEmail: cData?.promoterEmail || '',
          promoterUsername: cData?.promoterUsername || '',
          referredUserId: activeUser?.id || auth.currentUser?.uid || 'guest-user',
          referredUserEmail: activeUser?.email || auth.currentUser?.email || '',
          referredUserName: activeUser?.name || auth.currentUser?.displayName || 'Store Owner',
          status: 'QUALIFIED',
          source: 'checkout_input',
          createdAt: new Date().toISOString(),
        });
      } catch (leadErr) {
        console.warn('Direct referral lead creation note:', leadErr);
      }

      return { valid: true, message: `Referral code "${val.code}" applied successfully!` };
    }
    return { valid: false, message: val.message || 'Invalid referral code. Format: VEL + characters (e.g. VEL100).' };
  };

  const removeReferralCode = () => {
    setActiveReferralCode(null);
    try {
      localStorage.removeItem('velcora_ref_attribution_code');
    } catch {}
  };

  const applyToBecomePartner = async (data: {
    payoutMethod?: string;
    payoutDetails?: string;
    applicationNotes?: string;
  }): Promise<{ success: boolean; message: string }> => {
    try {
      setReferralLoading(true);
      const res = await fetch(getApiUrl('/api/referral/apply'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          userId: activeUser.id,
          userEmail: activeUser.email,
          userName: activeUser.name,
          ...data,
        }),
      });
      const resData = await res.json();
      if (resData.success && resData.partner) {
        setPartnerProfile(resData.partner);
        return { success: true, message: resData.message || 'Application submitted successfully.' };
      }
      return { success: false, message: resData.message || 'Application failed.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Network error applying for referral partner.' };
    } finally {
      setReferralLoading(false);
    }
  };

  const updatePartnerStatusByAdmin = async (
    partnerId: string,
    status: ReferralPartnerStatus,
    notes?: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(getApiUrl(`/api/referral/admin/partners/${partnerId}/status`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, notes }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchAdminReferralOverview();
        return { success: true, message: data.message || 'Partner status updated.' };
      }
      return { success: false, message: data.message || 'Failed to update partner status.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error updating partner status.' };
    }
  };

  const transitionCommissionByAdmin = async (
    commissionId: string,
    status: CommissionStatus,
    notes?: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(getApiUrl(`/api/referral/admin/commissions/${commissionId}/transition`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, notes }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchAdminReferralOverview();
        return { success: true, message: data.message || 'Commission transitioned.' };
      }
      return { success: false, message: data.message || 'Failed to transition commission.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error transitioning commission.' };
    }
  };

  const updateReferralConfigByAdmin = async (
    patch: Partial<ReferralConfig>
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(getApiUrl('/api/referral/admin/config'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (data.success && data.config) {
        setReferralConfig(data.config);
        await fetchAdminReferralOverview();
        return { success: true, message: 'Referral configuration updated successfully.' };
      }
      return { success: false, message: 'Failed to update referral configuration.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error updating configuration.' };
    }
  };

  const simulateRefundReversal = async (
    transactionReference: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(getApiUrl('/api/referral/admin/simulate-refund'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ transactionReference, reason }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchAdminReferralOverview();
        return { success: true, message: data.message || 'Refund reversal processed.' };
      }
      return { success: false, message: data.message || 'Failed to process refund reversal.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error processing refund reversal.' };
    }
  };

  const processSubscriptionPaymentWithReferral = async (
    planName: string,
    amount: number,
    transactionId: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(getApiUrl('/api/referral/process-payment-event'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          userId: activeUser.id,
          userEmail: activeUser.email,
          planName,
          amount,
          transactionId,
          referralCode: activeReferralCode || undefined,
        }),
      });
      const data = await res.json();
      return { success: data.success, message: data.message || 'Payment event processed.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error processing payment event.' };
    }
  };

  const runReferralSecurityTest = async (): Promise<{ success: boolean; allPassed: boolean; results: any[] }> => {
    try {
      const res = await fetch(getApiUrl('/api/referral/admin/run-security-test'), {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, allPassed: false, results: [] };
    }
  };

  // =========================================================================
  // MASTER PAYMENT, SUBSCRIPTION, TOKEN & GLOBAL PAYOUT IMPLEMENTATION
  // =========================================================================
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlanConfig[]>(() => DEFAULT_SUBSCRIPTION_PLANS);
  const [tokenPackages, setTokenPackages] = useState<TokenPackageConfig[]>(() => DEFAULT_TOKEN_PACKAGES);
  const [activeSubscription, setActiveSubscription] = useState<SubscriptionRecord | null>(null);
  const [paymentsActiveTab, setPaymentsActiveTab] = useState<'ledger' | 'wallet' | 'plans'>('ledger');
  const [userTransactions, setUserTransactions] = useState<MasterPaymentTransaction[]>([]);
  const [payoutAccounts, setPayoutAccounts] = useState<GlobalPayoutAccount[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [superAdminTelemetry, setSuperAdminTelemetry] = useState<any | null>(null);
  const [superAdminConfig, setSuperAdminConfig] = useState<SuperAdminConfig | null>(null);
  const [paymentLoading, setPaymentLoading] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);
  const [checkoutInitialTab, setCheckoutInitialTab] = useState<'subscriptions' | 'tokens'>('subscriptions');
  const [checkoutSelectedPlanId, setCheckoutSelectedPlanId] = useState<string | null>(null);
  const [checkoutSelectedPackageId, setCheckoutSelectedPackageId] = useState<string | null>(null);

  // Real-time Firestore sync for subscription plans and token packages
  useEffect(() => {
    const plansUnsub = onSnapshot(doc(db, 'system', 'plans'), (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        if (d && Array.isArray(d.plans)) {
          setSubscriptionPlans(d.plans);
        }
      }
    }, (err) => {
      console.warn('[VelcoraContext] Live plans snapshot listener note:', err);
    });

    const packagesUnsub = onSnapshot(doc(db, 'system', 'token_packages'), (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        if (d && Array.isArray(d.packages)) {
          setTokenPackages(d.packages);
        }
      }
    }, (err) => {
      console.warn('[VelcoraContext] Live token packages listener note:', err);
    });

    return () => {
      plansUnsub();
      packagesUnsub();
    };
  }, []);

  const openCheckoutModal = (initialTab: 'subscriptions' | 'tokens' = 'subscriptions', preselectId?: string) => {
    setCheckoutInitialTab(initialTab);
    if (initialTab === 'subscriptions') {
      setCheckoutSelectedPlanId(preselectId || null);
      setCheckoutSelectedPackageId(null);
    } else {
      setCheckoutSelectedPackageId(preselectId || null);
      setCheckoutSelectedPlanId(null);
    }
    setIsCheckoutModalOpen(true);
  };

  const closeCheckoutModal = () => {
    setIsCheckoutModalOpen(false);
    setCheckoutSelectedPlanId(null);
    setCheckoutSelectedPackageId(null);
  };

  const fetchPaymentConfig = async (): Promise<void> => {
    try {
      setPaymentLoading(true);
      const res = await fetch(getApiUrl('/api/payment/config'), { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        if (data.plans) setSubscriptionPlans(data.plans);
        if (data.tokenPackages) setTokenPackages(data.tokenPackages);
      }
    } catch (err: any) {
      console.warn('[VelcoraContext] Failed to fetch payment config:', err);
    } finally {
      setPaymentLoading(false);
    }
  };

  const fetchUserSubscription = async (): Promise<void> => {
    if (!activeUser?.id) return;
    try {
      const res = await fetch(getApiUrl(`/api/payment/my-subscription?userId=${encodeURIComponent(activeUser.id)}`), {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setActiveSubscription(data.subscription || null);
        setUserTransactions(data.transactions || []);
      }
    } catch (err: any) {
      console.warn('[VelcoraContext] Failed to fetch user subscription:', err);
    }
  };

  const initiateCheckoutSession = async (params: {
    itemType: 'SUBSCRIPTION' | 'TOKEN_PURCHASE';
    itemId: string;
    billingInterval?: 'monthly' | 'annual';
    currency?: string;
    provider?: PaymentGatewayProvider;
    referralCode?: string;
  }): Promise<{ success: boolean; session?: any; error?: string }> => {
    try {
      setPaymentLoading(true);
      const res = await fetch(getApiUrl('/api/payment/create-checkout-session'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          ...params,
          userId: activeUser?.id || 'usr-guest',
          userEmail: activeUser?.email || 'user@velcora.com',
          userName: activeUser?.name || 'Velcora User',
          businessId: activeBusiness?.id,
          businessName: activeBusiness?.name,
          referralCode: params.referralCode || activeReferralCode || undefined,
        }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to initiate checkout session.' };
    } finally {
      setPaymentLoading(false);
    }
  };

  const confirmOrderPayment = async (params: {
    transactionType: 'SUBSCRIPTION' | 'TOKEN_PURCHASE';
    planId?: string;
    packageId?: string;
    billingInterval?: 'monthly' | 'annual';
    amount: number;
    currency: string;
    provider: PaymentGatewayProvider;
    externalTransactionId?: string;
    paymentMethodDetails?: string;
    referralCode?: string;
  }): Promise<{ success: boolean; transaction?: MasterPaymentTransaction; subscription?: SubscriptionRecord; tokensCredited?: number; error?: string }> => {
    try {
      setPaymentLoading(true);
      const targetRefCode = params.referralCode || activeReferralCode || undefined;
      const targetUserId = activeUser?.id || auth.currentUser?.uid || 'usr-guest';
      const targetEmail = activeUser?.email || auth.currentUser?.email || 'user@velcora.com';
      const targetName = activeUser?.name || auth.currentUser?.displayName || 'Store Owner';
      const txId = params.externalTransactionId || `tx-${Date.now()}`;

      // 1. Calculate tokens and tier changes
      let tokensToAdd = 0;
      let newTier = 'free';

      if (params.transactionType === 'TOKEN_PURCHASE') {
        const pkg = tokenPackages.find(p => p.id === params.packageId);
        tokensToAdd = (pkg?.tokens || 0) + (pkg?.bonusTokens || 0);
      } else {
        const plan = subscriptionPlans.find(p => p.id === params.planId || p.tier === params.planId);
        newTier = plan?.tier || 'pro';
        tokensToAdd = plan?.tokensIncludedMonthly || 10000;
      }

      // 2. Direct real-time Cloud Firestore user update
      try {
        const userRef = doc(db, 'users', targetUserId);
        const uSnap = await getDoc(userRef);
        const existingData = uSnap.exists() ? uSnap.data() : {};
        const currentCredits = Number(existingData.availableCredits ?? existingData.aiTokensBalance ?? 500);
        const currentPurchased = Number(existingData.purchasedCredits || 0);

        await setDoc(userRef, {
          availableCredits: currentCredits + tokensToAdd,
          aiTokensBalance: currentCredits + tokensToAdd,
          purchasedCredits: params.transactionType === 'TOKEN_PURCHASE' ? currentPurchased + tokensToAdd : currentPurchased,
          subscriptionTier: params.transactionType === 'SUBSCRIPTION' ? newTier : (existingData.subscriptionTier || 'free'),
          subscriptionStatus: 'ACTIVE',
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (uErr) {
        console.warn('Firestore user payment update note:', uErr);
      }

      // 3. Attribute referral conversion if code is present
      if (params.transactionType === 'SUBSCRIPTION' && targetRefCode) {
        try {
          const codeRef = doc(db, 'referral_codes', targetRefCode.toUpperCase());
          const codeSnap = await getDoc(codeRef);
          if (codeSnap.exists()) {
            const cData = codeSnap.data();
            const promoterSnap = await getDoc(doc(db, 'referral_promoters', cData.promoterId));
            const promoterData = promoterSnap.exists() ? promoterSnap.data() : null;
            const globalConfigSnap = await getDoc(doc(db, 'referral_config', 'global'));
            const globalConfig = globalConfigSnap.exists() ? globalConfigSnap.data() : null;

            const rate = promoterData?.customCommissionRate ?? (globalConfig?.defaultRatePercent || 20);
            const commissionAmount = (params.amount * rate) / 100;

            await addDoc(collection(db, 'referral_conversions'), {
              promoterId: cData.promoterId,
              promoterEmail: cData.promoterEmail || '',
              promoterUsername: cData.promoterUsername || '',
              referralCode: targetRefCode.toUpperCase(),
              orderId: txId,
              subscriptionPlan: params.planId || newTier,
              subscriptionAmount: params.amount,
              commissionRateApplied: rate,
              commissionAmount,
              status: 'APPROVED',
              customerUid: targetUserId,
              customerEmail: targetEmail,
              createdAt: new Date().toISOString(),
            });

            await addDoc(collection(db, 'audit_logs'), {
              timestamp: new Date().toISOString(),
              adminId: 'system',
              adminEmail: 'system@velcora.com',
              action: 'REFERRAL_COMMISSION_ATTRIBUTED',
              targetCategory: 'REFERRAL',
              targetId: cData.promoterId,
              details: `Commission $${commissionAmount.toFixed(2)} (${rate}%) attributed to promoter ${cData.promoterUsername || cData.promoterId} for order ${txId}`,
            });
          }
        } catch (refConvErr) {
          console.warn('Referral conversion recording note:', refConvErr);
        }
      }

      // 4. Record transaction in audit_logs
      try {
        await addDoc(collection(db, 'audit_logs'), {
          timestamp: new Date().toISOString(),
          adminId: targetUserId,
          adminEmail: targetEmail,
          action: params.transactionType === 'SUBSCRIPTION' ? 'NEW_SUBSCRIPTION_PURCHASE' : 'TOKEN_PACK_PURCHASE',
          targetCategory: 'PAYMENT',
          targetId: txId,
          details: `Completed payment of ${params.amount} ${params.currency} via ${params.provider}. Credited ${tokensToAdd} tokens.`,
        });
      } catch {}

      if (params.transactionType === 'SUBSCRIPTION') {
        const subRecord: SubscriptionRecord = {
          subscriptionId: `sub-${targetUserId}-${Date.now()}`,
          userId: targetUserId,
          userEmail: targetEmail,
          planId: params.planId || `tier_${newTier}`,
          planName: `${newTier} Plan`,
          tier: newTier as any,
          billingInterval: params.billingInterval || 'monthly',
          amount: params.amount,
          currency: params.currency,
          status: 'active',
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          autoRenew: true,
          cancelAtPeriodEnd: false,
          tokensIncludedMonthly: tokensToAdd,
          tokensGrantedThisPeriod: true,
          paymentProvider: params.provider,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setActiveSubscription(subRecord);
      }

      return {
        success: true,
        tokensCredited: tokensToAdd,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to confirm order.' };
    } finally {
      setPaymentLoading(false);
    }
  };

  const cancelUserSubscription = async (cancelImmediately: boolean = false, reason?: string): Promise<{ success: boolean; message: string }> => {
    if (!activeUser?.id) return { success: false, message: 'User not authenticated.' };
    try {
      setPaymentLoading(true);
      const res = await fetch(getApiUrl('/api/payment/cancel-subscription'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          userId: activeUser.id,
          cancelImmediately,
          reason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchUserSubscription();
      }
      return { success: data.success, message: data.message || 'Subscription updated.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to cancel subscription.' };
    } finally {
      setPaymentLoading(false);
    }
  };

  const fetchPayoutAccounts = async (): Promise<void> => {
    const partnerId = partnerProfile?.id || (activeUser?.id ? `part-${activeUser.id}` : null);
    if (!partnerId) return;
    try {
      const res = await fetch(getApiUrl(`/api/payment/payout/accounts?partnerId=${encodeURIComponent(partnerId)}`), {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success && data.accounts) {
        setPayoutAccounts(data.accounts);
      }
    } catch (err: any) {
      console.warn('[VelcoraContext] Failed to fetch payout accounts:', err);
    }
  };

  const addPayoutAccount = async (account: Omit<GlobalPayoutAccount, 'id' | 'createdAt'>): Promise<{ success: boolean; account?: GlobalPayoutAccount; error?: string }> => {
    try {
      const res = await fetch(getApiUrl('/api/payment/payout/accounts'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(account),
      });
      const data = await res.json();
      if (data.success && data.account) {
        setPayoutAccounts(prev => [...prev, data.account]);
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to add payout account.' };
    }
  };

  const requestReferralPayout = async (payoutAccountId: string): Promise<{ success: boolean; payoutRequest?: PayoutRequest; error?: string }> => {
    const partnerId = partnerProfile?.id;
    if (!partnerId || !activeUser?.id) {
      return { success: false, error: 'Active referral partner profile required.' };
    }
    try {
      const res = await fetch(getApiUrl('/api/payment/payout/request'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          partnerId,
          userId: activeUser.id,
          userEmail: activeUser.email,
          userName: activeUser.name,
          payoutAccountId,
        }),
      });
      const data = await res.json();
      if (data.success && data.payoutRequest) {
        setPayoutRequests(prev => [data.payoutRequest, ...prev]);
        await fetchPartnerDashboard();
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error submitting payout request.' };
    }
  };

  const fetchSuperAdminData = async (): Promise<void> => {
    try {
      const res = await fetch(getApiUrl('/api/admin/overview'), {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success && data.telemetry) {
        setSuperAdminTelemetry(data.telemetry);
        if (data.telemetry.config) {
          setSuperAdminConfig(data.telemetry.config);
        }
        if (data.telemetry.plans) {
          setSubscriptionPlans(data.telemetry.plans);
        }
        if (data.telemetry.tokenPackages) {
          setTokenPackages(data.telemetry.tokenPackages);
        }
        if (data.telemetry.payoutRequests) {
          setPayoutRequests(data.telemetry.payoutRequests);
        }
      }
    } catch (err: any) {
      console.warn('[VelcoraContext] Failed to fetch super admin data:', err);
    }
  };

  const updateSubscriptionPlansByAdmin = async (plans: SubscriptionPlanConfig[]): Promise<{ success: boolean; error?: string }> => {
    try {
      await setDoc(doc(db, 'system', 'plans'), {
        plans,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email || 'admin@velcora.com',
      }, { merge: true });
      setSubscriptionPlans(plans);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update subscription plans.' };
    }
  };

  const updateTokenPackagesByAdmin = async (packages: TokenPackageConfig[]): Promise<{ success: boolean; error?: string }> => {
    try {
      await setDoc(doc(db, 'system', 'token_packages'), {
        packages,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email || 'admin@velcora.com',
      }, { merge: true });
      setTokenPackages(packages);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update token packages.' };
    }
  };

  const updateSuperAdminConfigByAdmin = async (patch: Partial<SuperAdminConfig>): Promise<{ success: boolean; error?: string }> => {
    try {
      await setDoc(doc(db, 'system', 'config'), {
        ...superAdminConfig,
        ...patch,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email || 'admin@velcora.com',
      }, { merge: true });
      setSuperAdminConfig(prev => prev ? ({ ...prev, ...patch }) : (patch as SuperAdminConfig));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update admin configuration.' };
    }
  };

  const processPayoutRequestByAdmin = async (
    payoutId: string,
    action: 'APPROVE' | 'COMPLETE' | 'FAIL' | 'CANCEL',
    notes?: string,
    transactionRef?: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const statusMap: Record<string, string> = {
        APPROVE: 'APPROVED',
        COMPLETE: 'COMPLETED',
        FAIL: 'FAILED',
        CANCEL: 'REJECTED',
      };
      const newStatus = statusMap[action] || action;
      await setDoc(doc(db, 'referral_payouts', payoutId), {
        status: newStatus,
        processedAt: new Date().toISOString(),
        processedBy: auth.currentUser?.email || 'admin@velcora.com',
        notes: notes || '',
        transactionRef: transactionRef || '',
      }, { merge: true });

      await addDoc(collection(db, 'audit_logs'), {
        timestamp: new Date().toISOString(),
        adminId: auth.currentUser?.uid || 'admin',
        adminEmail: auth.currentUser?.email || 'admin@velcora.com',
        action: `PAYOUT_${action}`,
        targetCategory: 'PAYOUT',
        targetId: payoutId,
        details: `Payout request ${payoutId} moved to status ${newStatus}. Ref: ${transactionRef || 'N/A'}`,
      });

      return { success: true, message: `Payout request marked as ${newStatus}.` };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error processing payout request.' };
    }
  };

  const refundPaymentTransactionByAdmin = async (transactionId: string, reason?: string): Promise<{ success: boolean; message: string }> => {
    try {
      await addDoc(collection(db, 'audit_logs'), {
        timestamp: new Date().toISOString(),
        adminId: auth.currentUser?.uid || 'admin',
        adminEmail: auth.currentUser?.email || 'admin@velcora.com',
        action: 'PAYMENT_REFUNDED',
        targetCategory: 'PAYMENT',
        targetId: transactionId,
        details: `Refund registered for transaction ${transactionId}. Reason: ${reason || 'Customer request'}`,
      });
      return { success: true, message: 'Refund registered in audit trail.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error processing refund.' };
    }
  };

  const runMasterSecurityMatrix = async (): Promise<{
    success: boolean;
    allPassed: boolean;
    passCount: number;
    failCount: number;
    tests: any[];
  }> => {
    try {
      const res = await fetch(getApiUrl('/api/admin/security/run-matrix'), {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return {
        success: false,
        allPassed: false,
        passCount: 0,
        failCount: 1,
        tests: [{ id: 0, name: 'Connection Error', category: 'Network', status: 'FAILED', details: err?.message }],
      };
    }
  };

  // Real-Time Cloud Firestore Synchronizer for Plans, Token Packages, and Platform Configuration
  useEffect(() => {
    // 1. Live Subscription Plans listener from system/plans
    const plansUnsub = onSnapshot(doc(db, 'system', 'plans'), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.plans && Array.isArray(d.plans)) {
          setSubscriptionPlans(d.plans);
        }
      }
    }, (err) => {
      console.warn('Real-time subscription plans snapshot note:', err);
    });

    // 2. Live Token Packages listener from system/token_packages
    const packagesUnsub = onSnapshot(doc(db, 'system', 'token_packages'), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.packages && Array.isArray(d.packages)) {
          setTokenPackages(d.packages);
        }
      }
    }, (err) => {
      console.warn('Real-time token packages snapshot note:', err);
    });

    // 3. Live Platform Config listener from system/config
    const configUnsub = onSnapshot(doc(db, 'system', 'config'), (snap) => {
      if (snap.exists()) {
        setSuperAdminConfig(snap.data() as SuperAdminConfig);
      }
    }, (err) => {
      console.warn('Real-time system config snapshot note:', err);
    });

    return () => {
      plansUnsub();
      packagesUnsub();
      configUnsub();
    };
  }, []);

  // Auto-fetch user subscription when activeUser changes
  useEffect(() => {
    if (activeUser?.id) {
      fetchUserSubscription();
    }
  }, [activeUser?.id]);

  // Customizable Keyboard Shortcuts state and helpers
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>(() => {
    try {
      const saved = localStorage.getItem('velcora_keyboard_shortcuts');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading keyboard shortcuts:', e);
    }
    return [
      { id: 'focus_search', label: 'Focus Product Search', description: 'Jump cursor straight to POS search bar', key: 'F2' },
      { id: 'add_customer', label: 'Quick Add Customer', description: 'Open customer assignment form', key: 'F3' },
      { id: 'apply_discount', label: 'Apply Discount', description: 'Trigger checkout discount editor', key: 'F4' },
      { id: 'void_cart', label: 'Void / Clear Cart', description: 'Remove all items currently in cart', key: 'F7' },
      { id: 'pay_checkout', label: 'Pay & Checkout', description: 'Trigger master payment and print window', key: 'F8' },
      { id: 'barcode_scan', label: 'Scan Barcode Simulator', description: 'Open barcode scanner testing utility', key: 'F9' },
      { id: 'voice_pilot', label: 'Voice Pilot AI HUD', description: 'Toggle interactive voice-command HUD modal', key: 'v', altKey: true }
    ];
  });

  useEffect(() => {
    localStorage.setItem('velcora_keyboard_shortcuts', JSON.stringify(shortcuts));
  }, [shortcuts]);

  const updateShortcut = (id: string, updated: Partial<KeyboardShortcut>): { success: boolean; error?: string } => {
    const candidateKey = (updated.key || '').toLowerCase();
    const candidateCtrl = updated.ctrlKey ?? false;
    const candidateAlt = updated.altKey ?? false;
    const candidateShift = updated.shiftKey ?? false;

    const conflict = shortcuts.find(s => {
      if (s.id === id) return false;
      
      const currentKey = (s.key || '').toLowerCase();
      const currentCtrl = s.ctrlKey ?? false;
      const currentAlt = s.altKey ?? false;
      const currentShift = s.shiftKey ?? false;

      return currentKey === candidateKey && 
             currentCtrl === candidateCtrl && 
             currentAlt === candidateAlt && 
             currentShift === candidateShift;
    });

    if (conflict) {
      return { 
        success: false, 
        error: `Conflict! This key layout is already assigned to "${conflict.label}".` 
      };
    }

    setShortcuts(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
    return { success: true };
  };

  const resetShortcuts = () => {
    setShortcuts([
      { id: 'focus_search', label: 'Focus Product Search', description: 'Jump cursor straight to POS search bar', key: 'F2' },
      { id: 'add_customer', label: 'Quick Add Customer', description: 'Open customer assignment form', key: 'F3' },
      { id: 'apply_discount', label: 'Apply Discount', description: 'Trigger checkout discount editor', key: 'F4' },
      { id: 'void_cart', label: 'Void / Clear Cart', description: 'Remove all items currently in cart', key: 'F7' },
      { id: 'pay_checkout', label: 'Pay & Checkout', description: 'Trigger master payment and print window', key: 'F8' },
      { id: 'barcode_scan', label: 'Scan Barcode Simulator', description: 'Open barcode scanner testing utility', key: 'F9' },
      { id: 'voice_pilot', label: 'Voice Pilot AI HUD', description: 'Toggle interactive voice-command HUD modal', key: 'v', altKey: true }
    ]);
  };

  return (
    <VelcoraContext.Provider
      value={{
        authUser,
        userProfile,
        authLoading,
        authError,
        isAuthenticated,
        hasCompletedOnboarding,
        authSessionType,
        loginAsOwner,
        signupAsOwner,
        loginWithGoogle,
        sendPhoneOtpCode,
        loginWithPhoneOtpCode,
        loginAsStaff,
        quickLoginAsDemo,
        logout,
        setHasCompletedOnboarding,
        businesses,
        allBusinesses: businesses,
        activeBusiness,
        setActiveBusinessId,
        updateActiveBusiness,
        updateBusinessProfile: updateActiveBusiness,
        addNewBusiness,
        activeMode,
        setActiveMode: handleSetActiveMode,
        currentModule,
        setCurrentModule: handleSetCurrentModule,
        currency,
        setCurrency,
        theme,
        setTheme,
        toggleTheme,
        primaryColor,
        setPrimaryColor,
        activeUser,
        activeSubuser: activeUser,
        setActiveUser,
        subusers,
        addSubuser,
        updateSubuser,
        deleteSubuser,
        workstations,
        addWorkstation,
        updateWorkstation,
        deleteWorkstation,
        authorizeWorkstation,
        revokeWorkstation,
        isOffline,
        offlineSalesQueue,
        syncOfflineSales,
        restoreBackupData,
        roles,
        addRole,
        updateRole,
        deleteRole,
        hasPermission,
        isOnboardingOpen,
        setIsOnboardingOpen,
        completeOnboarding,
        isAiAssistantOpen,
        setIsAiAssistantOpen,
        products: activeProducts,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        customers: activeCustomers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        loyaltyConfig,
        setLoyaltyConfig,
        updateLoyaltyConfig,
        suppliers: activeSuppliers,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        purchaseOrders,
        addPurchaseOrder,
        receivePurchaseOrder,
        sales: activeSales,
        salesHistory: activeSales,
        saleOrders,
        estimates,
        creditNotes,
        deliveryNotes,
        addSaleOrder,
        addNewSaleOrder: addSaleOrder,
        convertEstimateToSale,
        addEstimate,
        addCreditNote,
        addDeliveryNote,
        processSaleReturnOrExchange,
        expenses: activeExpenses,
        addExpense,
        updateExpense,
        deleteExpense,
        otherIncomes: activeOtherIncomes,
        addOtherIncome,
        updateOtherIncome,
        deleteOtherIncome,
        commissions,
        budgets: activeBudgets,
        addBudget,
        updateBudget,
        deleteBudget,
        loans: activeLoans,
        addLoan,
        updateLoan,
        deleteLoan,
        addLoanPayment,
        customerCredits: activeCustomerCredits,
        addCustomerCredit,
        recordCustomerCreditPayment,
        supplierPayables: activeSupplierPayables,
        addSupplierPayable,
        recordSupplierPayablePayment,
        promotions,
        addPromotion,
        updatePromotion,
        deletePromotion,
        taxRates,
        addTaxRate,
        updateTaxRate,
        deleteTaxRate,
        paymentsList,
        addPaymentRecord,
        cart,
        addToCart,
        removeFromCart,
        updateCartItemQty,
        updateCartItemDiscount,
        clearCart,
        selectedCustomerId,
        setSelectedCustomerId,
        selectedCustomer,
        redeemPoints,
        setRedeemPoints,
        heldCarts,
        holdCurrentCart,
        resumeHeldCart,
        deleteHeldCart,
        completeSale,
        brainMetrics,
        brainHealth,
        businessGoals,
        addBusinessGoal,
        updateBusinessGoal,
        tasks,
        addTask,
        updateTask,
        deleteTask,
        executeAiAction,
        smartAlerts,
        dismissAlert,
        aiModels,
        activeModelId,
        setActiveModelId,
        aiUsageStats,
        onlineOrders,
        submitOnlineStoreOrder,
        sharedIntelligenceContext: {
          ...sharedIntelligenceContext,
          bestSellingProduct: activeProducts && activeProducts.length > 0 
            ? (() => {
                const sorted = [...activeProducts].sort((a: any, b: any) => (b.unitsSold || 0) - (a.unitsSold || 0));
                const first = sorted[0] as any;
                return {
                  id: first.id,
                  name: first.name,
                  category: first.category || 'Apparel',
                  price: first.sellingPrice || 0,
                  unitsSold: 28,
                };
              })()
            : null
        },
        setSharedIntelligenceContext,
        recordRecommendationOutcome,
        // Referral Engine Context Exports
        referralConfig,
        activeReferralCode,
        isReferralCodeApplied,
        partnerProfile,
        partnerDashboard,
        adminReferralOverview,
        referralLoading,
        referralError,
        validateReferralCode,
        applyReferralCode,
        removeReferralCode,
        applyToBecomePartner,
        fetchPartnerStatus,
        fetchPartnerDashboard,
        fetchAdminReferralOverview,
        updatePartnerStatusByAdmin,
        transitionCommissionByAdmin,
        updateReferralConfigByAdmin,
        simulateRefundReversal,
        processSubscriptionPaymentWithReferral,
        runReferralSecurityTest,

        // Master Payment, Subscription, Token & Global Payout System
        subscriptionPlans,
        tokenPackages,
        activeSubscription,
        userTransactions,
        payoutAccounts,
        payoutRequests,
        superAdminTelemetry,
        superAdminConfig,
        paymentLoading,
        paymentError,
        isCheckoutModalOpen,
        checkoutInitialTab,
        checkoutSelectedPlanId,
        checkoutSelectedPackageId,
        openCheckoutModal,
        closeCheckoutModal,
        fetchPaymentConfig,
        fetchUserSubscription,
        initiateCheckoutSession,
        confirmOrderPayment,
        cancelUserSubscription,
        fetchPayoutAccounts,
        addPayoutAccount,
        requestReferralPayout,
        fetchSuperAdminData,
        updateSubscriptionPlansByAdmin,
        updateTokenPackagesByAdmin,
        updateSuperAdminConfigByAdmin,
        processPayoutRequestByAdmin,
        refundPaymentTransactionByAdmin,
        runMasterSecurityMatrix,
        paymentsActiveTab,
        setPaymentsActiveTab,
        shortcuts,
        updateShortcut,
        resetShortcuts,
      }}
    >
      {children}
    </VelcoraContext.Provider>
  );
};

export const useVelcora = () => {
  const context = useContext(VelcoraContext);
  if (!context) {
    throw new Error('useVelcora must be used within a VelcoraProvider');
  }
  return context;
};
