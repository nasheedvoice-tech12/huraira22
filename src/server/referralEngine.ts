import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { Request, Response, NextFunction } from 'express';
import type {
  ReferralPartner,
  ReferralPartnerStatus,
  ReferralRecord,
  ReferralAttribution,
  CommissionRecord,
  CommissionStatus,
  PaymentEvent,
  ReferralConfig,
  ReferralPartnerStats,
  ReferralAuditLog,
} from '../types';

// ============================================================================
// IN-MEMORY SECURE REPOSITORY & INITIAL STATE
// ============================================================================

export interface ReferralDatabaseState {
  config: ReferralConfig;
  partners: ReferralPartner[];
  referrals: ReferralRecord[];
  attributions: ReferralAttribution[];
  commissions: CommissionRecord[];
  paymentEvents: PaymentEvent[];
  auditLogs: ReferralAuditLog[];
}

const DEFAULT_REFERRAL_CONFIG: ReferralConfig = {
  programEnabled: true,
  commissionAmount: 3.0, // $3 USD default per qualifying subscription
  currency: 'USD',
  eligiblePlans: ['Pro', 'Enterprise', 'Ultimate', 'Growth', 'Retail Pro', 'Pro Monthly', 'Pro Annual', 'Enterprise Annual'],
  verificationPeriodDays: 14,
  minPayoutAmount: 20.0,
  selfReferralProtection: true,
  allowCustomerDiscount: false,
  payoutIntegrationConfigured: false, // Payout infrastructure marked as pending configuration until Stripe Connect / ACH is connected
};

// Seed sample active partner and referral code VEL453821 for out-of-the-box verification
const initialPartners: ReferralPartner[] = [
  {
    partnerId: 'part-velcora-8921',
    userId: 'user-01', // Alexander Vance (Store Owner)
    userEmail: 'alexander@velcora.com',
    userName: 'Alexander Vance',
    status: 'ACTIVE',
    referralCode: 'VEL453821',
    payoutMethod: 'stripe_connect',
    payoutDetails: 'acct_1N9v2kVelcoraDemo',
    applicationNotes: 'Certified retail growth agency partner and founder.',
    createdAt: '2026-01-15T09:00:00Z',
    approvedAt: '2026-01-15T10:30:00Z',
  },
  {
    partnerId: 'part-velcora-1204',
    userId: 'user-02',
    userEmail: 'sarah.jenkins@velcora.com',
    userName: 'Sarah Jenkins',
    status: 'ACTIVE',
    referralCode: 'VEL782645',
    payoutMethod: 'bank_transfer',
    payoutDetails: 'IBAN US89210044991288',
    applicationNotes: 'Boutique consultant onboarding regional shops.',
    createdAt: '2026-02-01T12:00:00Z',
    approvedAt: '2026-02-02T14:00:00Z',
  },
  {
    partnerId: 'part-velcora-5591',
    userId: 'user-03',
    userEmail: 'david.chen@velcora.com',
    userName: 'David Chen',
    status: 'PENDING',
    payoutMethod: 'paypal',
    payoutDetails: 'dchen.tech@example.com',
    applicationNotes: 'Point of sale hardware installer across California.',
    createdAt: '2026-02-20T11:20:00Z',
  },
];

const initialReferrals: ReferralRecord[] = [
  {
    referralId: 'ref-code-453821',
    referralPartnerId: 'part-velcora-8921',
    referralCode: 'VEL453821',
    status: 'ACTIVE',
    createdAt: '2026-01-15T10:30:00Z',
  },
  {
    referralId: 'ref-code-782645',
    referralPartnerId: 'part-velcora-1204',
    referralCode: 'VEL782645',
    status: 'ACTIVE',
    createdAt: '2026-02-02T14:00:00Z',
  },
];

const initialAttributions: ReferralAttribution[] = [
  {
    attributionId: 'attr-101',
    referralId: 'ref-code-453821',
    referralCode: 'VEL453821',
    referredUserId: 'client-usr-901',
    referredUserEmail: 'client1@aurora-fashion.com',
    source: 'url_param',
    ipHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    status: 'QUALIFIED',
    createdAt: '2026-02-05T08:12:00Z',
    qualifiedAt: '2026-02-05T08:30:00Z',
  },
  {
    attributionId: 'attr-102',
    referralId: 'ref-code-453821',
    referralCode: 'VEL453821',
    referredUserId: 'client-usr-902',
    referredUserEmail: 'marcus@solstice-apparel.com',
    source: 'checkout_input',
    ipHash: 'a8b9c1d2e3f4a5b6c7d8e9f0123456789abcdef0123456789abcdef012345678',
    status: 'QUALIFIED',
    createdAt: '2026-02-10T14:45:00Z',
    qualifiedAt: '2026-02-10T15:00:00Z',
  },
  {
    attributionId: 'attr-103',
    referralId: 'ref-code-453821',
    referralCode: 'VEL453821',
    referredUserId: 'client-usr-903',
    referredUserEmail: 'elena@vance-bakery.com',
    source: 'url_param',
    ipHash: '9f8e7d6c5b4a3210fedcba9876543210abcdef9876543210fedcba9876543210',
    status: 'QUALIFIED',
    createdAt: '2026-02-18T10:00:00Z',
    qualifiedAt: '2026-02-18T10:15:00Z',
  },
  {
    attributionId: 'attr-104',
    referralId: 'ref-code-453821',
    referralCode: 'VEL453821',
    referredUserId: 'client-usr-904',
    referredUserEmail: 'support@pacific-grocers.com',
    source: 'checkout_input',
    ipHash: '11223344556677889900aabbccddeeff0011223344556677889900aabbccddeeff',
    status: 'QUALIFIED',
    createdAt: '2026-02-24T16:20:00Z',
    qualifiedAt: '2026-02-24T16:35:00Z',
  },
];

const initialCommissions: CommissionRecord[] = [
  {
    commissionId: 'comm-201',
    referralId: 'ref-code-453821',
    referralPartnerId: 'part-velcora-8921',
    attributionId: 'attr-101',
    subscriptionPlan: 'Enterprise Annual',
    paymentEventId: 'evt-stripe-99120',
    amount: 3.0,
    currency: 'USD',
    status: 'AVAILABLE',
    createdAt: '2026-02-05T08:30:00Z',
    approvedAt: '2026-02-19T08:30:00Z',
    availableAt: '2026-02-19T08:30:00Z',
    notes: 'Qualifying subscription payment verified. 14-day hold period cleared.',
  },
  {
    commissionId: 'comm-202',
    referralId: 'ref-code-453821',
    referralPartnerId: 'part-velcora-8921',
    attributionId: 'attr-102',
    subscriptionPlan: 'Pro Monthly',
    paymentEventId: 'evt-stripe-99121',
    amount: 3.0,
    currency: 'USD',
    status: 'AVAILABLE',
    createdAt: '2026-02-10T15:00:00Z',
    approvedAt: '2026-02-24T15:00:00Z',
    availableAt: '2026-02-24T15:00:00Z',
    notes: 'Qualifying subscription payment verified. 14-day hold period cleared.',
  },
  {
    commissionId: 'comm-203',
    referralId: 'ref-code-453821',
    referralPartnerId: 'part-velcora-8921',
    attributionId: 'attr-103',
    subscriptionPlan: 'Pro Monthly',
    paymentEventId: 'evt-stripe-99122',
    amount: 3.0,
    currency: 'USD',
    status: 'AVAILABLE',
    createdAt: '2026-02-18T10:15:00Z',
    approvedAt: '2026-02-25T10:15:00Z',
    availableAt: '2026-02-25T10:15:00Z',
    notes: 'Qualifying subscription payment verified. Hold period cleared.',
  },
  {
    commissionId: 'comm-204',
    referralId: 'ref-code-453821',
    referralPartnerId: 'part-velcora-8921',
    attributionId: 'attr-104',
    subscriptionPlan: 'Enterprise Annual',
    paymentEventId: 'evt-stripe-99123',
    amount: 3.0,
    currency: 'USD',
    status: 'AVAILABLE',
    createdAt: '2026-02-20T16:35:00Z',
    approvedAt: '2026-02-26T16:35:00Z',
    availableAt: '2026-02-26T16:35:00Z',
    notes: 'Qualifying subscription payment verified. Hold period cleared.',
  },
  {
    commissionId: 'comm-205',
    referralId: 'ref-code-453821',
    referralPartnerId: 'part-velcora-8921',
    attributionId: 'attr-104',
    subscriptionPlan: 'Growth Tier',
    paymentEventId: 'evt-stripe-99124',
    amount: 3.0,
    currency: 'USD',
    status: 'PENDING',
    createdAt: '2026-02-26T11:00:00Z',
    notes: 'Qualifying subscription payment verified. In 14-day anti-fraud verification period.',
  },
  {
    commissionId: 'comm-206',
    referralId: 'ref-code-453821',
    referralPartnerId: 'part-velcora-8921',
    attributionId: 'attr-104',
    subscriptionPlan: 'Pro Monthly',
    paymentEventId: 'evt-stripe-99125',
    amount: 3.0,
    currency: 'USD',
    status: 'PENDING',
    createdAt: '2026-02-27T14:20:00Z',
    notes: 'Qualifying subscription payment verified. In 14-day anti-fraud verification period.',
  },
];

const initialPaymentEvents: PaymentEvent[] = [
  {
    eventId: 'evt-stripe-99120',
    provider: 'stripe',
    externalEventId: 'evt_3Msz42Velcora01',
    transactionReference: 'pi_3Msz42000000000000000001',
    amount: 299.0,
    currency: 'USD',
    eventType: 'payment_intent.succeeded',
    subscriptionPlan: 'Enterprise Annual',
    userId: 'client-usr-901',
    referralCode: 'VEL453821',
    receivedAt: '2026-02-05T08:30:00Z',
    processedAt: '2026-02-05T08:30:05Z',
    signatureVerified: true,
  },
];

const initialAuditLogs: ReferralAuditLog[] = [
  {
    logId: 'audit-log-01',
    actorId: 'system-init',
    actorRole: 'SYSTEM',
    action: 'SYSTEM_BOOTSTRAP',
    targetType: 'REFERRAL_SYSTEM',
    targetId: 'velcora-referral-core',
    details: 'Referral engine initialized with cryptographic token generators and privacy protection rules.',
    timestamp: '2026-01-01T00:00:00Z',
  },
  {
    logId: 'audit-log-02',
    actorId: 'admin-alexander',
    actorRole: 'ADMIN',
    action: 'PARTNER_APPROVED',
    targetType: 'REFERRAL_PARTNER',
    targetId: 'part-velcora-8921',
    details: 'Partner approved. Unique public attribution code VEL453821 securely issued.',
    timestamp: '2026-01-15T10:30:00Z',
  },
];

// In-Memory & Persistent Database Instance
class ReferralStore {
  private filePath = path.join(process.cwd(), 'data', 'referral_state.json');
  private state: ReferralDatabaseState;

  constructor() {
    this.state = this.loadFromDisk();
  }

  private loadFromDisk(): ReferralDatabaseState {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.partners)) {
          // Merge with defaults to ensure completeness
          return {
            config: { ...DEFAULT_REFERRAL_CONFIG, ...(parsed.config || {}) },
            partners: parsed.partners || [...initialPartners],
            referrals: parsed.referrals || [...initialReferrals],
            attributions: parsed.attributions || [...initialAttributions],
            commissions: parsed.commissions || [...initialCommissions],
            paymentEvents: parsed.paymentEvents || [...initialPaymentEvents],
            auditLogs: parsed.auditLogs || [...initialAuditLogs],
          };
        }
      }
    } catch (err) {
      console.warn('[ReferralStore] Could not load persisted referral state from disk, using initial state:', err);
    }

    return {
      config: { ...DEFAULT_REFERRAL_CONFIG },
      partners: [...initialPartners],
      referrals: [...initialReferrals],
      attributions: [...initialAttributions],
      commissions: [...initialCommissions],
      paymentEvents: [...initialPaymentEvents],
      auditLogs: [...initialAuditLogs],
    };
  }

  private saveToDisk(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[ReferralStore] Failed to write referral state to disk:', err);
    }
  }

  public getConfig(): ReferralConfig {
    return { ...this.state.config };
  }

  public updateConfig(patch: Partial<ReferralConfig>, actorId: string): ReferralConfig {
    this.state.config = {
      ...this.state.config,
      ...patch,
    };
    this.logAudit({
      actorId,
      actorRole: 'ADMIN',
      action: 'CONFIG_UPDATED',
      targetType: 'REFERRAL_CONFIG',
      targetId: 'global',
      details: `Updated parameters: ${Object.keys(patch).join(', ')}`,
    });
    this.saveToDisk();
    return { ...this.state.config };
  }

  public getPartners(): ReferralPartner[] {
    return [...this.state.partners];
  }

  public getPartnerById(partnerId: string): ReferralPartner | undefined {
    return this.state.partners.find(p => p.partnerId === partnerId);
  }

  public getPartnerByUserId(userId: string): ReferralPartner | undefined {
    return this.state.partners.find(p => p.userId === userId);
  }

  public getReferrals(): ReferralRecord[] {
    return [...this.state.referrals];
  }

  public getReferralByCode(code: string): ReferralRecord | undefined {
    const normalized = this.normalizeCode(code);
    return this.state.referrals.find(r => r.referralCode === normalized);
  }

  public getAttributions(): ReferralAttribution[] {
    return [...this.state.attributions];
  }

  public getCommissions(): CommissionRecord[] {
    return [...this.state.commissions];
  }

  public getPaymentEvents(): PaymentEvent[] {
    return [...this.state.paymentEvents];
  }

  public getAuditLogs(): ReferralAuditLog[] {
    return [...this.state.auditLogs];
  }

  // Generate a cryptographically secure, unique VEL + 6 digits code (e.g., VEL453821)
  public generateUniqueReferralCode(): string {
    const MAX_ATTEMPTS = 50;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      // Secure random integer between 100000 and 999999
      const randomNum = crypto.randomInt(100000, 1000000);
      const code = `VEL${randomNum}`;
      // Check if already used in all historical referrals
      const exists = this.state.referrals.some(r => r.referralCode === code);
      if (!exists) {
        return code;
      }
    }
    // Fallback if collision frequency is high
    const timestampSuffix = Math.floor(100000 + (Date.now() % 900000));
    return `VEL${timestampSuffix}`;
  }

  public normalizeCode(code: string): string {
    if (!code) return '';
    return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  public isValidCodeFormat(code: string): boolean {
    const norm = this.normalizeCode(code);
    return /^VEL\d{6}$/.test(norm);
  }

  public logAudit(entry: Omit<ReferralAuditLog, 'logId' | 'timestamp'>) {
    const log: ReferralAuditLog = {
      ...entry,
      logId: `log-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      timestamp: new Date().toISOString(),
    };
    this.state.auditLogs.unshift(log);
    // Keep max 1000 logs in memory
    if (this.state.auditLogs.length > 1000) {
      this.state.auditLogs.pop();
    }
  }

  // Apply to become partner
  public applyPartner(data: {
    userId: string;
    userEmail: string;
    userName: string;
    payoutMethod?: ReferralPartner['payoutMethod'];
    payoutDetails?: string;
    applicationNotes?: string;
  }): { success: boolean; partner?: ReferralPartner; message: string } {
    if (!this.state.config.programEnabled) {
      return { success: false, message: 'Referral program is currently paused by administration.' };
    }

    const existing = this.getPartnerByUserId(data.userId);
    if (existing) {
      if (existing.status === 'REVOKED') {
        return { success: false, message: 'Your referral partner account was previously revoked. Please contact support.' };
      }
      return { success: true, partner: existing, message: `Your partner account is currently ${existing.status}.` };
    }

    const partnerId = `part-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const newPartner: ReferralPartner = {
      partnerId,
      userId: data.userId,
      userEmail: data.userEmail,
      userName: data.userName,
      status: 'PENDING',
      payoutMethod: data.payoutMethod || 'manual',
      payoutDetails: data.payoutDetails || '',
      applicationNotes: data.applicationNotes || '',
      createdAt: new Date().toISOString(),
    };

    this.state.partners.push(newPartner);
    this.logAudit({
      actorId: data.userId,
      actorRole: 'USER',
      action: 'PARTNER_APPLIED',
      targetType: 'REFERRAL_PARTNER',
      targetId: partnerId,
      details: `User ${data.userEmail} submitted referral partner application.`,
    });
    this.saveToDisk();

    return { success: true, partner: newPartner, message: 'Referral partner application submitted for review.' };
  }

  // Admin update partner status
  public updatePartnerStatus(
    partnerId: string,
    newStatus: ReferralPartnerStatus,
    adminId: string,
    notes?: string
  ): { success: boolean; partner?: ReferralPartner; referralCode?: string; message: string } {
    const partner = this.state.partners.find(p => p.partnerId === partnerId);
    if (!partner) {
      return { success: false, message: 'Partner record not found.' };
    }

    const prevStatus = partner.status;
    partner.status = newStatus;
    const now = new Date().toISOString();

    let issuedCode: string | undefined = partner.referralCode;

    if (newStatus === 'ACTIVE') {
      partner.approvedAt = now;
      // If partner doesn't have an active referral code, generate one now
      if (!partner.referralCode) {
        issuedCode = this.generateUniqueReferralCode();
        partner.referralCode = issuedCode;

        const newReferral: ReferralRecord = {
          referralId: `ref-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
          referralPartnerId: partner.partnerId,
          referralCode: issuedCode,
          status: 'ACTIVE',
          createdAt: now,
        };
        this.state.referrals.push(newReferral);
      } else {
        // Activate referral record if inactive
        const existingRef = this.state.referrals.find(r => r.referralCode === partner.referralCode);
        if (existingRef) {
          existingRef.status = 'ACTIVE';
        }
      }
    } else if (newStatus === 'SUSPENDED') {
      partner.suspendedAt = now;
      if (partner.referralCode) {
        const existingRef = this.state.referrals.find(r => r.referralCode === partner.referralCode);
        if (existingRef) existingRef.status = 'INACTIVE';
      }
    } else if (newStatus === 'REVOKED') {
      partner.revokedAt = now;
      if (partner.referralCode) {
        const existingRef = this.state.referrals.find(r => r.referralCode === partner.referralCode);
        if (existingRef) existingRef.status = 'REVOKED';
      }
    }

    this.logAudit({
      actorId: adminId,
      actorRole: 'ADMIN',
      action: `PARTNER_STATUS_${newStatus}`,
      targetType: 'REFERRAL_PARTNER',
      targetId: partnerId,
      details: `Status changed from ${prevStatus} to ${newStatus}. ${notes ? `Notes: ${notes}` : ''} ${issuedCode ? `Code: ${issuedCode}` : ''}`,
    });
    this.saveToDisk();

    return { success: true, partner, referralCode: issuedCode, message: `Partner status updated to ${newStatus}.` };
  }

  // Validate Code for Public Checkout / Landing
  public validatePublicCode(rawCode: string): { valid: boolean; code?: string; message?: string } {
    if (!this.state.config.programEnabled) {
      return { valid: false, message: 'Referral program is currently not active.' };
    }

    const normalized = this.normalizeCode(rawCode);
    if (!this.isValidCodeFormat(normalized)) {
      return { valid: false, message: 'Referral code must follow format VEL + 6 digits (e.g., VEL453821).' };
    }

    const referral = this.state.referrals.find(r => r.referralCode === normalized && r.status === 'ACTIVE');
    if (!referral) {
      return { valid: false, message: 'Referral code not recognized or inactive.' };
    }

    const partner = this.state.partners.find(p => p.partnerId === referral.referralPartnerId);
    if (!partner || partner.status !== 'ACTIVE') {
      return { valid: false, message: 'Referral code not recognized or inactive.' };
    }

    // PRIVACY: Never return partner identity, name, or email to the public checkout
    return { valid: true, code: normalized, message: 'Referral code verified.' };
  }

  // Track Attribution (e.g. from signup link or manual checkout entry)
  public trackAttribution(params: {
    referralCode: string;
    referredUserId: string;
    referredUserEmail?: string;
    source: ReferralAttribution['source'];
    clientIp?: string;
  }): { success: boolean; attribution?: ReferralAttribution; message: string } {
    const codeVal = this.validatePublicCode(params.referralCode);
    if (!codeVal.valid || !codeVal.code) {
      return { success: false, message: codeVal.message || 'Invalid referral code.' };
    }

    const referral = this.state.referrals.find(r => r.referralCode === codeVal.code && r.status === 'ACTIVE');
    if (!referral) {
      return { success: false, message: 'Referral code inactive.' };
    }

    const partner = this.state.partners.find(p => p.partnerId === referral.referralPartnerId);
    if (!partner) {
      return { success: false, message: 'Referral partner not found.' };
    }

    // Anti-Self-Referral Check
    if (this.state.config.selfReferralProtection) {
      if (
        partner.userId === params.referredUserId ||
        (params.referredUserEmail && partner.userEmail.toLowerCase() === params.referredUserEmail.toLowerCase())
      ) {
        this.logAudit({
          actorId: params.referredUserId,
          actorRole: 'USER',
          action: 'SELF_REFERRAL_BLOCKED',
          targetType: 'ATTRIBUTION',
          targetId: referral.referralCode,
          details: `Self-referral attempt blocked for user ${params.referredUserId} matching partner ${partner.partnerId}.`,
        });
        return { success: false, message: 'Self-referral is not permitted by fraud rules.' };
      }
    }

    // Check if an attribution already exists for this referred user
    const existing = this.state.attributions.find(a => a.referredUserId === params.referredUserId);
    if (existing) {
      return { success: true, attribution: existing, message: 'Attribution already recorded.' };
    }

    // Hash client IP for privacy + fraud detection
    const ipHash = params.clientIp
      ? crypto.createHash('sha256').update(params.clientIp + 'velcora-salt').digest('hex')
      : undefined;

    const attributionId = `attr-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const newAttr: ReferralAttribution = {
      attributionId,
      referralId: referral.referralId,
      referralCode: referral.referralCode,
      referredUserId: params.referredUserId,
      referredUserEmail: params.referredUserEmail,
      source: params.source,
      ipHash,
      status: 'ATTRIBUTED',
      createdAt: new Date().toISOString(),
    };

    this.state.attributions.push(newAttr);
    this.logAudit({
      actorId: params.referredUserId,
      actorRole: 'USER',
      action: 'ATTRIBUTION_RECORDED',
      targetType: 'REFERRAL_ATTRIBUTION',
      targetId: attributionId,
      details: `Attribution created for code ${referral.referralCode} via ${params.source}.`,
    });
    this.saveToDisk();

    return { success: true, attribution: newAttr, message: 'Attribution recorded.' };
  }

  // Process Verified Payment Event & Create Commission Idempotently
  public processPaymentWebhook(paymentEvent: PaymentEvent): {
    success: boolean;
    commission?: CommissionRecord;
    message: string;
  } {
    // 1. Idempotency Check: Prevent duplicate processing of the same payment event or external ID
    const duplicate = this.state.paymentEvents.find(
      e => e.externalEventId === paymentEvent.externalEventId || e.transactionReference === paymentEvent.transactionReference
    );
    if (duplicate) {
      return { success: false, message: 'Payment event already processed (idempotent skip).' };
    }

    // 2. Record payment event
    this.state.paymentEvents.unshift(paymentEvent);

    // 3. Handle Refund or Dispute
    if (paymentEvent.eventType === 'charge.refunded' || paymentEvent.eventType === 'charge.dispute.created') {
      return this.reverseCommissionByPayment(paymentEvent.transactionReference, 'Refund/Chargeback webhook received');
    }

    // 4. Check if program is enabled
    if (!this.state.config.programEnabled) {
      return { success: false, message: 'Referral program disabled. No commission created.' };
    }

    // 5. Verify Plan Eligibility
    const isEligiblePlan = this.state.config.eligiblePlans.some(
      plan => plan.toLowerCase() === paymentEvent.subscriptionPlan.toLowerCase() ||
        paymentEvent.subscriptionPlan.toLowerCase().includes(plan.toLowerCase())
    );
    if (!isEligiblePlan) {
      return { success: false, message: `Subscription plan "${paymentEvent.subscriptionPlan}" is not eligible for referral reward.` };
    }

    // 6. Find Attribution (either by user ID or by passed referral code)
    let attribution = this.state.attributions.find(
      a => a.referredUserId === paymentEvent.userId && a.status !== 'DISQUALIFIED'
    );

    let referralRecord: ReferralRecord | undefined;

    if (attribution) {
      referralRecord = this.state.referrals.find(r => r.referralId === attribution!.referralId && r.status === 'ACTIVE');
    } else if (paymentEvent.referralCode) {
      const normCode = this.normalizeCode(paymentEvent.referralCode);
      referralRecord = this.state.referrals.find(r => r.referralCode === normCode && r.status === 'ACTIVE');
      if (referralRecord) {
        // Create attribution on the fly
        const attrRes = this.trackAttribution({
          referralCode: referralRecord.referralCode,
          referredUserId: paymentEvent.userId,
          source: 'checkout_input',
        });
        if (attrRes.success && attrRes.attribution) {
          attribution = attrRes.attribution;
        }
      }
    }

    if (!referralRecord || !attribution) {
      return { success: true, message: 'Payment processed successfully without referral attribution.' };
    }

    // Find Partner
    const partner = this.state.partners.find(p => p.partnerId === referralRecord!.referralPartnerId && p.status === 'ACTIVE');
    if (!partner) {
      return { success: false, message: 'Partner inactive or revoked. Commission withheld.' };
    }

    // Anti-Self-Referral Check
    if (this.state.config.selfReferralProtection && partner.userId === paymentEvent.userId) {
      this.logAudit({
        actorId: paymentEvent.userId,
        actorRole: 'SYSTEM',
        action: 'COMMISSION_SELF_REFERRAL_BLOCKED',
        targetType: 'COMMISSION',
        targetId: paymentEvent.transactionReference,
        details: `Blocked commission on self-payment for partner ${partner.partnerId}.`,
      });
      return { success: false, message: 'Self-referral detected. Commission blocked.' };
    }

    // Check if commission already exists for this payment event or attribution
    const existingCommission = this.state.commissions.find(
      c => c.paymentEventId === paymentEvent.eventId || (c.attributionId === attribution!.attributionId && c.status !== 'REVERSED')
    );
    if (existingCommission) {
      return { success: false, message: 'Commission already recorded for this attribution/subscription.' };
    }

    // Update attribution status to QUALIFIED
    attribution.status = 'QUALIFIED';
    attribution.qualifiedAt = new Date().toISOString();

    // Create Commission in PENDING state
    const commissionId = `comm-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const newCommission: CommissionRecord = {
      commissionId,
      referralId: referralRecord.referralId,
      referralPartnerId: partner.partnerId,
      attributionId: attribution.attributionId,
      subscriptionPlan: paymentEvent.subscriptionPlan,
      paymentEventId: paymentEvent.eventId,
      amount: this.state.config.commissionAmount,
      currency: this.state.config.currency,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      notes: `Verified ${paymentEvent.provider} payment for ${paymentEvent.subscriptionPlan}. In ${this.state.config.verificationPeriodDays}-day hold.`,
    };

    this.state.commissions.unshift(newCommission);

    this.logAudit({
      actorId: 'payment-webhook',
      actorRole: 'SYSTEM',
      action: 'COMMISSION_CREATED',
      targetType: 'COMMISSION',
      targetId: commissionId,
      details: `Created $${newCommission.amount} commission for partner ${partner.partnerId} on ${paymentEvent.subscriptionPlan}.`,
    });
    this.saveToDisk();

    return {
      success: true,
      commission: newCommission,
      message: `Commission created successfully in PENDING status.`,
    };
  }

  // Reverse Commission upon Refund / Dispute
  public reverseCommissionByPayment(
    transactionReference: string,
    reason: string
  ): { success: boolean; reversedCount: number; message: string } {
    const payment = this.state.paymentEvents.find(p => p.transactionReference === transactionReference);
    let reversedCount = 0;

    this.state.commissions.forEach(comm => {
      if (
        (payment && comm.paymentEventId === payment.eventId) ||
        comm.notes?.includes(transactionReference)
      ) {
        if (comm.status !== 'REVERSED') {
          comm.status = 'REVERSED';
          comm.reversedAt = new Date().toISOString();
          comm.notes = `${comm.notes || ''} | REVERSED: ${reason}`;
          reversedCount++;

          this.logAudit({
            actorId: 'payment-refund-hook',
            actorRole: 'SYSTEM',
            action: 'COMMISSION_REVERSED',
            targetType: 'COMMISSION',
            targetId: comm.commissionId,
            details: `Commission ${comm.commissionId} reversed due to ${reason}.`,
          });
        }
      }
    });

    if (reversedCount > 0) {
      this.saveToDisk();
    }

    return {
      success: true,
      reversedCount,
      message: `Reversed ${reversedCount} commission record(s).`,
    };
  }

  // Transition Commission Lifecycle (Admin action)
  public transitionCommission(
    commissionId: string,
    newStatus: CommissionStatus,
    adminId: string,
    notes?: string
  ): { success: boolean; commission?: CommissionRecord; message: string } {
    const comm = this.state.commissions.find(c => c.commissionId === commissionId);
    if (!comm) {
      return { success: false, message: 'Commission not found.' };
    }

    const prev = comm.status;
    comm.status = newStatus;
    const now = new Date().toISOString();

    if (newStatus === 'APPROVED') comm.approvedAt = now;
    if (newStatus === 'AVAILABLE') comm.availableAt = now;
    if (newStatus === 'PAID') comm.paidAt = now;
    if (newStatus === 'REVERSED') comm.reversedAt = now;

    if (notes) {
      comm.notes = `${comm.notes || ''} | ${notes}`;
    }

    this.logAudit({
      actorId: adminId,
      actorRole: 'ADMIN',
      action: `COMMISSION_${newStatus}`,
      targetType: 'COMMISSION',
      targetId: commissionId,
      details: `Commission status updated from ${prev} to ${newStatus}. Notes: ${notes || 'None'}`,
    });
    this.saveToDisk();

    return { success: true, commission: comm, message: `Commission transitioned to ${newStatus}.` };
  }

  // Get Safe Anonymous Dashboard for a Partner (Strict Customer Privacy)
  public getPartnerDashboard(partnerId: string): ReferralPartnerStats | null {
    const partner = this.state.partners.find(p => p.partnerId === partnerId);
    if (!partner || partner.status !== 'ACTIVE') {
      return null;
    }

    const referral = this.state.referrals.find(r => r.referralPartnerId === partner.partnerId && r.status === 'ACTIVE');
    const referralCode = referral?.referralCode || partner.referralCode || 'PENDING';
    const referralLink = `https://admin-3666e.web.app/signup?ref=${referralCode}`;

    // Get all commissions for this partner
    const partnerCommissions = this.state.commissions.filter(c => c.referralPartnerId === partner.partnerId);

    // Calculate aggregated metrics
    const successfulReferrals = partnerCommissions.filter(c => c.status !== 'REVERSED').length;
    const pendingRewards = partnerCommissions
      .filter(c => c.status === 'PENDING')
      .reduce((sum, c) => sum + c.amount, 0);
    const availableRewards = partnerCommissions
      .filter(c => c.status === 'AVAILABLE' || c.status === 'APPROVED')
      .reduce((sum, c) => sum + c.amount, 0);
    const totalPaid = partnerCommissions
      .filter(c => c.status === 'PAID')
      .reduce((sum, c) => sum + c.amount, 0);
    const totalEarned = partnerCommissions
      .filter(c => c.status !== 'REVERSED')
      .reduce((sum, c) => sum + c.amount, 0);

    // Build ANONYMOUS recent activity: NEVER leak customer name, email, user ID, or phone
    const recentActivity = partnerCommissions.slice(0, 10).map(c => ({
      id: c.commissionId,
      description: `Qualifying ${c.subscriptionPlan || 'Subscription'}`,
      reward: c.amount,
      currency: c.currency,
      status: c.status,
      date: c.createdAt,
      eventDate: c.createdAt,
      referenceHash: c.paymentEventId ? `hash_${c.paymentEventId.slice(-6).toLowerCase()}` : `ref_${c.commissionId.slice(-6).toLowerCase()}`,
      planName: c.subscriptionPlan || 'Velcora Pro Plan',
      commissionAmount: c.amount,
      holdReleaseDate: c.availableAt || c.approvedAt || new Date(new Date(c.createdAt).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    }));

    return {
      partnerId: partner.partnerId,
      referralCode,
      referralLink,
      status: partner.status,
      successfulReferrals,
      pendingRewards,
      availableRewards,
      totalEarned,
      totalPaid,
      currency: this.state.config.currency,
      recentActivity,
    };
  }

  // Admin Full Overview Dataset
  public getAdminOverview() {
    const totalRevenueReferred = this.state.commissions
      .filter(c => c.status !== 'REVERSED')
      .length * 199.0; // Estimated aggregate value
    const totalCommissionsEarned = this.state.commissions
      .filter(c => c.status !== 'REVERSED')
      .reduce((sum, c) => sum + c.amount, 0);
    const totalCommissionsPending = this.state.commissions
      .filter(c => c.status === 'PENDING')
      .reduce((sum, c) => sum + c.amount, 0);
    const totalCommissionsAvailable = this.state.commissions
      .filter(c => c.status === 'AVAILABLE' || c.status === 'APPROVED')
      .reduce((sum, c) => sum + c.amount, 0);
    const totalCommissionsPaid = this.state.commissions
      .filter(c => c.status === 'PAID')
      .reduce((sum, c) => sum + c.amount, 0);

    return {
      config: this.state.config,
      metrics: {
        totalPartners: this.state.partners.length,
        activePartners: this.state.partners.filter(p => p.status === 'ACTIVE').length,
        pendingPartners: this.state.partners.filter(p => p.status === 'PENDING').length,
        totalAttributions: this.state.attributions.length,
        qualifiedAttributions: this.state.attributions.filter(a => a.status === 'QUALIFIED').length,
        totalRevenueReferred,
        totalCommissionsEarned,
        totalCommissionsPending,
        totalCommissionsAvailable,
        totalCommissionsPaid,
      },
      partners: this.state.partners,
      referrals: this.state.referrals,
      attributions: this.state.attributions,
      commissions: this.state.commissions,
      paymentEvents: this.state.paymentEvents,
      auditLogs: this.state.auditLogs,
    };
  }
}

export const referralStore = new ReferralStore();
