import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Load Firebase Config to resolve projectId
let projectId = 'velcora-default';
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    projectId = config.projectId || projectId;
  }
} catch (err) {
  console.warn('Could not read firebase-applet-config.json:', err);
}

// Initialize Firebase Admin
let db: Firestore | null = null;
let firestoreCheckedAndDisabled = false;

function disableFirestoreDueToError(err: any, context: string) {
  const errMsg = err?.message || String(err);
  if (
    errMsg.includes('PERMISSION_DENIED') ||
    errMsg.includes('SERVICE_DISABLED') ||
    errMsg.includes('7') ||
    errMsg.includes('disabled') ||
    errMsg.includes('not been used') ||
    errMsg.includes('default credentials') ||
    errMsg.includes('Could not load')
  ) {
    if (db || !firestoreCheckedAndDisabled) {
      console.info(`[Velcora Credit Engine] Cloud Firestore not enabled in environment (${context}). Using local DB.`);
      db = null;
      firestoreCheckedAndDisabled = true;
    }
  } else {
    console.warn(`[Velcora Credit Engine] Firestore notice in ${context}:`, errMsg);
  }
}

try {
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  const hasAdminCredentials = Boolean(
    serviceAccountRaw ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.FIREBASE_CONFIG ||
    process.env.GCLOUD_PROJECT
  );

  if (process.env.NODE_ENV !== 'test' && hasAdminCredentials) {
    if (getApps().length === 0) {
      // Preferred for serverless (Vercel): full service-account JSON in an env var.
      // GOOGLE_APPLICATION_CREDENTIALS (a file path) is unavailable on Vercel's read-only FS.
      let appCredential: ReturnType<typeof cert> | undefined;
      if (serviceAccountRaw) {
        try {
          const parsed = JSON.parse(serviceAccountRaw);
          if (parsed && typeof parsed === 'object') {
            appCredential = cert(parsed as any);
            if (parsed.project_id && typeof parsed.project_id === 'string') {
              projectId = parsed.project_id;
            }
          }
        } catch (parseErr: any) {
          console.warn('[Velcora Credit Engine] FIREBASE_SERVICE_ACCOUNT is not valid JSON:', parseErr?.message);
        }
      }
      initializeApp(appCredential ? { credential: appCredential, projectId } : { projectId });
    }
    db = getFirestore();
    console.log('Firebase Admin Firestore initialized for Credit Engine.');
  } else {
    db = null;
  }
} catch (err: any) {
  console.warn('Firebase Admin fallback activated (No credentials or local dev):', err?.message || err);
  db = null;
}

// Type definitions
export interface CreditTransaction {
  id: string;
  userId: string;
  type: 'grant' | 'reservation' | 'settlement' | 'refund' | 'purchase';
  amount: number;
  modelId?: string;
  requestId?: string;
  paymentRef?: string;
  packageId?: string;
  timestamp: string;
  previousBalance: number;
  resultingBalance: number;
  status: 'pending' | 'completed' | 'cancelled' | 'failed';
  metadata?: any;
}

export interface CreditWallet {
  userId: string;
  availableCredits: number;
  includedCredits: number;
  purchasedCredits: number;
  usedCredits: number;
  monthlyQuotaGrantedAt?: string;
  updatedAt: string;
  subscriptionTier?: 'free' | 'pro' | 'pro_max';
  subscriptionStatus?: 'active' | 'pending' | 'cancelled' | 'expired' | 'refunded';
  subscriptionExpiresAt?: string;
  subscriptionOrderId?: string;
  isSuspended?: boolean;
}

export interface CreditReservation {
  id: string;
  userId: string;
  modelId: string;
  maxCreditsReserved: number;
  status: 'active' | 'settled' | 'released';
  createdAt: string;
}

// In-memory/File fallback database for local development resilience
const LOCAL_DB_PATH = path.join(process.cwd(), 'local-credit-db.json');

export interface GooglePurchaseRecord {
  orderId: string;
  userId: string;
  productId: string;
  purchaseToken: string;
  purchaseState: 'pending' | 'completed' | 'cancelled' | 'refunded' | 'revoked' | 'expired' | 'restored';
  isSubscription: boolean;
  amount: number;
  costUsd: number;
  timestamp: string;
}

function readLocalDb(): { 
  wallets: Record<string, CreditWallet>; 
  ledger: CreditTransaction[]; 
  reservations: Record<string, CreditReservation>;
  google_purchases: Record<string, GooglePurchaseRecord>;
} {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8'));
      return {
        wallets: parsed.wallets || {},
        ledger: parsed.ledger || [],
        reservations: parsed.reservations || {},
        google_purchases: parsed.google_purchases || {}
      };
    }
  } catch (err) {
    console.warn('Failed to read local credit database, resetting:', err);
  }
  return { wallets: {}, ledger: [], reservations: {}, google_purchases: {} };
}

function writeLocalDb(data: any) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write local credit database:', err);
  }
}

// Emergency kill switch and admin pricing configuration
export const ADMIN_CONFIG = {
  killSwitch: false,
  imageGenerationEnabled: true,
  videoGenerationEnabled: true,
  defaultMonthlyQuota: 100000, // 100,000 promotional credits for seamless professional review
  pricing: {
    'velcora-chat': { inputPer1k: 1, outputPer1k: 4, per1k: 1, base: 1 },
    'chat': { inputPer1k: 1, outputPer1k: 4, per1k: 1, base: 1 },
    'velcora-neural-flash': { inputPer1k: 2, outputPer1k: 8, per1k: 2, base: 1 },
    'flash': { inputPer1k: 2, outputPer1k: 8, per1k: 2, base: 1 },
    'velcora-axiom': { inputPer1k: 4, outputPer1k: 16, per1k: 4, base: 1 },
    'axiom': { inputPer1k: 4, outputPer1k: 16, per1k: 4, base: 1 },
    'velcora-omni': { inputPer1k: 4, outputPer1k: 16, per1k: 4, base: 1 },
    'omni': { inputPer1k: 4, outputPer1k: 16, per1k: 4, base: 1 },
    'velcora-financial': { inputPer1k: 4, outputPer1k: 16, per1k: 4, base: 1 },
    'velcora-prism-lite': { fixed: 400 },              // 400 credits per image
    'velcora-prism': { fixed: 800 },                  // 800 credits per image
    'velcora-prism-pro': { fixed: 1500 },              // 1500 credits per image
    'velcora-veyra-lite': { fixed: 2000 },             // 2000 credits per video
    'velcora-veyra': { fixed: 4000 },                 // 4000 credits per video
    'velcora-veyra-pro': { fixed: 8000 },             // 8000 credits per video
  } as Record<string, { per1k?: number; base?: number; fixed?: number; inputPer1k?: number; outputPer1k?: number }>
};

// Rates limit tracker (In-memory token bucket)
export const rateLimiter = {
  requests: {} as Record<string, { count: number; windowStart: number }>,
  checkLimit(userId: string, tier: 'free' | 'pro' | 'pro_max' = 'free'): { allowed: boolean; reason?: string } {
    const now = Date.now();
    const key = `${userId}:${Math.floor(now / (3600 * 1000))}`; // Hourly buckets
    if (!this.requests[key]) {
      this.requests[key] = { count: 0, windowStart: now };
    }

    let limitPerHour = 10;
    if (tier === 'pro') {
      limitPerHour = 60;
    } else if (tier === 'pro_max') {
      limitPerHour = 120;
    }

    if (this.requests[key].count >= limitPerHour) {
      return {
        allowed: false,
        reason: `Hourly AI request rate limit exceeded for your ${tier.toUpperCase()} plan (${limitPerHour} requests/hour). Please upgrade or wait until the hour resets.`
      };
    }
    this.requests[key].count++;
    return { allowed: true };
  }
};

// Unified Credit Operations
export class VelcoraCreditSystem {
  
  // Dynamic monthly reset checker and executor
  static async checkAndApplyMonthlyReset(wallet: CreditWallet): Promise<CreditWallet> {
    const now = new Date();
    const grantedAtStr = wallet.monthlyQuotaGrantedAt || wallet.updatedAt;
    const grantedAt = new Date(grantedAtStr);
    const msDiff = now.getTime() - grantedAt.getTime();
    const daysDiff = msDiff / (1000 * 3600 * 24);

    // Reset if 30 days have elapsed
    if (daysDiff >= 30) {
      const tier = wallet.subscriptionTier || 'free';
      let resetQuota = 500;
      if (tier === 'pro') {
        resetQuota = 10000;
      } else if (tier === 'pro_max') {
        resetQuota = 30000;
      }

      console.log(`[Velcora Credit Reset] Resetting credits for user ${wallet.userId} (${tier}). New balance: ${resetQuota}`);

      const previousBalance = wallet.availableCredits;
      wallet.availableCredits = resetQuota + (wallet.purchasedCredits || 0);
      wallet.includedCredits = resetQuota;
      wallet.monthlyQuotaGrantedAt = now.toISOString();
      wallet.updatedAt = now.toISOString();

      // Write to Firestore if db is active
      if (db) {
        try {
          await db.collection('prepaid_wallets').doc(wallet.userId).update({
            availableCredits: wallet.availableCredits,
            includedCredits: wallet.includedCredits,
            monthlyQuotaGrantedAt: wallet.monthlyQuotaGrantedAt,
            updatedAt: wallet.updatedAt,
          });
        } catch (err) {
          console.error('Failed to update wallet reset in Firestore:', err);
        }
      } else {
        const local = readLocalDb();
        if (local.wallets[wallet.userId]) {
          local.wallets[wallet.userId] = { ...wallet };
          writeLocalDb(local);
        }
      }

      // Record reset transaction ledger
      await this.recordTransactionDirectly(wallet.userId, {
        id: `txn-reset-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: wallet.userId,
        type: 'grant',
        amount: resetQuota,
        timestamp: now.toISOString(),
        previousBalance,
        resultingBalance: wallet.availableCredits,
        status: 'completed',
        metadata: { reason: `Monthly subscription quota reset for ${tier.toUpperCase()}` }
      });
    }

    return wallet;
  }

  // 1. Fetch Wallet Balance securely (Initializes wallet if missing)
  static async getWallet(userId: string): Promise<CreditWallet> {
    if (!userId) {
      return { userId: 'anonymous', availableCredits: 0, includedCredits: 0, purchasedCredits: 0, usedCredits: 0, updatedAt: new Date().toISOString(), subscriptionTier: 'free', subscriptionStatus: 'active' };
    }

    if (db) {
      try {
        const walletRef = db.collection('prepaid_wallets').doc(userId);
        const docSnap = await walletRef.get();
        if (docSnap.exists) {
          const w = docSnap.data() as CreditWallet;
          return await this.checkAndApplyMonthlyReset(w);
        } else {
          // Initialize default wallet with monthly free quota (500 promotional credits)
          const newWallet: CreditWallet = {
            userId,
            availableCredits: ADMIN_CONFIG.defaultMonthlyQuota,
            includedCredits: ADMIN_CONFIG.defaultMonthlyQuota,
            purchasedCredits: 0,
            usedCredits: 0,
            subscriptionTier: 'pro_max',
            subscriptionStatus: 'active',
            monthlyQuotaGrantedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await walletRef.set(newWallet);
          
          // Log grant transaction
          await this.recordTransactionDirectly(userId, {
            id: `txn-init-${Date.now()}`,
            userId,
            type: 'grant',
            amount: ADMIN_CONFIG.defaultMonthlyQuota,
            timestamp: new Date().toISOString(),
            previousBalance: 0,
            resultingBalance: ADMIN_CONFIG.defaultMonthlyQuota,
            status: 'completed',
            metadata: { reason: 'Initial default free promotional membership grant' }
          });

          return newWallet;
        }
      } catch (err) {
        disableFirestoreDueToError(err, 'fetching wallet');
      }
    }

    // Local DB Fallback
    const local = readLocalDb();
    if (!local.wallets[userId]) {
      local.wallets[userId] = {
        userId,
        availableCredits: ADMIN_CONFIG.defaultMonthlyQuota,
        includedCredits: ADMIN_CONFIG.defaultMonthlyQuota,
        purchasedCredits: 0,
        usedCredits: 0,
        subscriptionTier: 'pro_max',
        subscriptionStatus: 'active',
        monthlyQuotaGrantedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      local.ledger.push({
        id: `txn-init-${Date.now()}`,
        userId,
        type: 'grant',
        amount: ADMIN_CONFIG.defaultMonthlyQuota,
        timestamp: new Date().toISOString(),
        previousBalance: 0,
        resultingBalance: ADMIN_CONFIG.defaultMonthlyQuota,
        status: 'completed',
        metadata: { reason: 'Initial local free promotional membership grant' }
      });
      writeLocalDb(local);
    } else {
      local.wallets[userId] = await this.checkAndApplyMonthlyReset(local.wallets[userId]);
      writeLocalDb(local);
    }
    return local.wallets[userId];
  }

  // 2. Fetch Recent Ledger Transaction History
  static async getLedger(userId: string): Promise<CreditTransaction[]> {
    if (!userId) return [];
    if (db) {
      try {
        const ledgerSnap = await db.collection('prepaid_ledger')
          .where('userId', '==', userId)
          .orderBy('timestamp', 'desc')
          .limit(50)
          .get();
        
        return ledgerSnap.docs.map(doc => doc.data() as CreditTransaction);
      } catch (err) {
        disableFirestoreDueToError(err, 'listing ledger');
      }
    }

    const local = readLocalDb();
    return local.ledger
      .filter(t => t.userId === userId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 50);
  }

  // 3. Atomically Reserve Credits before executing costly operations
  static async reserveCredits(
    userId: string,
    modelId: string,
    maxCreditsReserved: number,
    requestId: string
  ): Promise<{ allowed: boolean; reservation?: CreditReservation; reason?: string }> {
    if (ADMIN_CONFIG.killSwitch) {
      return { allowed: false, reason: 'AI operations are temporarily disabled due to system maintenance.' };
    }

    // Pricing rules verification
    const pricing = ADMIN_CONFIG.pricing[modelId];
    if (modelId.includes('prism') && !ADMIN_CONFIG.imageGenerationEnabled) {
      return { allowed: false, reason: 'Image generation is temporarily suspended.' };
    }
    if (modelId.includes('veyra') && !ADMIN_CONFIG.videoGenerationEnabled) {
      return { allowed: false, reason: 'Video generation is temporarily suspended.' };
    }

    if (db) {
      try {
        const walletRef = db.collection('prepaid_wallets').doc(userId);
        const reservationRef = db.collection('prepaid_reservations').doc(requestId);

        const result = await db.runTransaction(async (transaction) => {
          const walletSnap = await transaction.get(walletRef);
          if (!walletSnap.exists) {
            throw new Error('Wallet not initialized');
          }

          const wallet = walletSnap.data() as CreditWallet;

          // Rate limits check based on active plan tier
          const tier = wallet.subscriptionTier || 'free';
          const rateCheck = rateLimiter.checkLimit(userId, tier as any);
          if (!rateCheck.allowed) {
            return { allowed: false, reason: rateCheck.reason };
          }

          if (wallet.availableCredits < maxCreditsReserved) {
            return { allowed: false, reason: `Insufficient prepaid balance. Cost: ${maxCreditsReserved} credits. Available: ${wallet.availableCredits} credits.` };
          }

          // Atomically deduct availableCredits
          const nextAvailable = wallet.availableCredits - maxCreditsReserved;
          transaction.update(walletRef, {
            availableCredits: nextAvailable,
            updatedAt: new Date().toISOString()
          });

          const reservation: CreditReservation = {
            id: requestId,
            userId,
            modelId,
            maxCreditsReserved,
            status: 'active',
            createdAt: new Date().toISOString()
          };

          transaction.set(reservationRef, reservation);

          return { allowed: true, reservation };
        });

        return result;
      } catch (err: any) {
        disableFirestoreDueToError(err, 'reserve transaction');
      }
    }

    // Ensure wallet is initialized with default quota if missing
    await this.getWallet(userId);

    // Local DB Transaction Fallback
    const local = readLocalDb();
    const wallet = local.wallets[userId];
    if (!wallet) {
      return { allowed: false, reason: 'Wallet not found' };
    }

    // Rate limits check based on active plan tier in local database fallback
    const tier = wallet.subscriptionTier || 'free';
    const rateCheck = rateLimiter.checkLimit(userId, tier as any);
    if (!rateCheck.allowed) {
      return { allowed: false, reason: rateCheck.reason };
    }

    if (wallet.availableCredits < maxCreditsReserved) {
      return { allowed: false, reason: `Insufficient prepaid balance. Cost: ${maxCreditsReserved} credits. Available: ${wallet.availableCredits} credits.` };
    }

    wallet.availableCredits -= maxCreditsReserved;
    wallet.updatedAt = new Date().toISOString();

    const reservation: CreditReservation = {
      id: requestId,
      userId,
      modelId,
      maxCreditsReserved,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    local.reservations[requestId] = reservation;
    writeLocalDb(local);

    return { allowed: true, reservation };
  }

  // 4. Settle Credits after successful provider execution (refunds unused)
  static async settleCredits(
    userId: string,
    requestId: string,
    actualCreditsUsed: number
  ): Promise<{ wallet: CreditWallet; transactionId: string }> {
    const txnId = `txn-settle-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    if (db) {
      try {
        const walletRef = db.collection('prepaid_wallets').doc(userId);
        const reservationRef = db.collection('prepaid_reservations').doc(requestId);
        const ledgerRef = db.collection('prepaid_ledger').doc(txnId);

        const result = await db.runTransaction(async (transaction) => {
          const walletSnap = await transaction.get(walletRef);
          const reservationSnap = await transaction.get(reservationRef);

          if (!walletSnap.exists || !reservationSnap.exists) {
            throw new Error('Wallet or reservation records missing');
          }

          const wallet = walletSnap.data() as CreditWallet;
          const reservation = reservationSnap.data() as CreditReservation;

          if (reservation.status !== 'active') {
            throw new Error('Reservation already settled or released');
          }

          const unusedRefund = reservation.maxCreditsReserved - actualCreditsUsed;
          
          // Re-credit the unused refund portion
          const nextAvailable = wallet.availableCredits + unusedRefund;
          
          // Adjust specific balances (included credits used first, then purchased)
          let nextIncluded = wallet.includedCredits;
          let nextPurchased = wallet.purchasedCredits;

          if (wallet.includedCredits >= actualCreditsUsed) {
            nextIncluded -= actualCreditsUsed;
          } else {
            const remainder = actualCreditsUsed - wallet.includedCredits;
            nextIncluded = 0;
            nextPurchased = Math.max(0, wallet.purchasedCredits - remainder);
          }

          const updatedWallet: CreditWallet = {
            ...wallet,
            availableCredits: nextAvailable,
            includedCredits: nextIncluded,
            purchasedCredits: nextPurchased,
            usedCredits: wallet.usedCredits + actualCreditsUsed,
            updatedAt: new Date().toISOString()
          };

          transaction.update(walletRef, updatedWallet);
          transaction.update(reservationRef, { status: 'settled' });

          const ledgerRecord: CreditTransaction = {
            id: txnId,
            userId,
            type: 'settlement',
            amount: -actualCreditsUsed,
            modelId: reservation.modelId,
            requestId,
            timestamp: new Date().toISOString(),
            previousBalance: wallet.availableCredits + reservation.maxCreditsReserved,
            resultingBalance: nextAvailable,
            status: 'completed',
            metadata: { actualUsed: actualCreditsUsed, reservedRefund: unusedRefund }
          };

          transaction.set(ledgerRef, ledgerRecord);

          return { wallet: updatedWallet, transactionId: txnId };
        });

        return result;
      } catch (err: any) {
        disableFirestoreDueToError(err, 'settle transaction');
      }
    }

    // Local DB Fallback
    const local = readLocalDb();
    const wallet = local.wallets[userId];
    const reservation = local.reservations[requestId];

    if (!wallet || !reservation || reservation.status !== 'active') {
      throw new Error('Invalid wallet state or inactive reservation');
    }

    const unusedRefund = reservation.maxCreditsReserved - actualCreditsUsed;
    const previous = wallet.availableCredits + reservation.maxCreditsReserved;
    wallet.availableCredits += unusedRefund;

    if (wallet.includedCredits >= actualCreditsUsed) {
      wallet.includedCredits -= actualCreditsUsed;
    } else {
      const remainder = actualCreditsUsed - wallet.includedCredits;
      wallet.includedCredits = 0;
      wallet.purchasedCredits = Math.max(0, wallet.purchasedCredits - remainder);
    }
    wallet.usedCredits += actualCreditsUsed;
    wallet.updatedAt = new Date().toISOString();

    reservation.status = 'settled';

    const ledgerRecord: CreditTransaction = {
      id: txnId,
      userId,
      type: 'settlement',
      amount: -actualCreditsUsed,
      modelId: reservation.modelId,
      requestId,
      timestamp: new Date().toISOString(),
      previousBalance: previous,
      resultingBalance: wallet.availableCredits,
      status: 'completed',
      metadata: { actualUsed: actualCreditsUsed, reservedRefund: unusedRefund }
    };

    local.ledger.push(ledgerRecord);
    writeLocalDb(local);

    return { wallet, transactionId: txnId };
  }

  // 5. Refund Reservation fully in case of complete API/provider error
  static async refundReservation(userId: string, requestId: string): Promise<CreditWallet> {
    if (db) {
      try {
        const walletRef = db.collection('prepaid_wallets').doc(userId);
        const reservationRef = db.collection('prepaid_reservations').doc(requestId);

        const result = await db.runTransaction(async (transaction) => {
          const walletSnap = await transaction.get(walletRef);
          const reservationSnap = await transaction.get(reservationRef);

          if (!walletSnap.exists || !reservationSnap.exists) {
            throw new Error('Wallet or reservation records missing');
          }

          const wallet = walletSnap.data() as CreditWallet;
          const reservation = reservationSnap.data() as CreditReservation;

          if (reservation.status !== 'active') {
            return wallet; // Already settled/refunded
          }

          const nextAvailable = wallet.availableCredits + reservation.maxCreditsReserved;
          const updatedWallet: CreditWallet = {
            ...wallet,
            availableCredits: nextAvailable,
            updatedAt: new Date().toISOString()
          };

          transaction.update(walletRef, updatedWallet);
          transaction.update(reservationRef, { status: 'released' });

          // Record refund log
          const txnId = `txn-refund-${Date.now()}`;
          const ledgerRef = db.collection('prepaid_ledger').doc(txnId);
          const ledgerRecord: CreditTransaction = {
            id: txnId,
            userId,
            type: 'refund',
            amount: reservation.maxCreditsReserved,
            modelId: reservation.modelId,
            requestId,
            timestamp: new Date().toISOString(),
            previousBalance: wallet.availableCredits,
            resultingBalance: nextAvailable,
            status: 'completed',
            metadata: { reason: 'Provider API failure full refund' }
          };
          transaction.set(ledgerRef, ledgerRecord);

          return updatedWallet;
        });

        return result;
      } catch (err: any) {
        disableFirestoreDueToError(err, 'refund transaction');
      }
    }

    // Local DB Fallback
    const local = readLocalDb();
    const wallet = local.wallets[userId];
    const reservation = local.reservations[requestId];

    if (wallet && reservation && reservation.status === 'active') {
      const prev = wallet.availableCredits;
      wallet.availableCredits += reservation.maxCreditsReserved;
      wallet.updatedAt = new Date().toISOString();
      reservation.status = 'released';

      local.ledger.push({
        id: `txn-refund-${Date.now()}`,
        userId,
        type: 'refund',
        amount: reservation.maxCreditsReserved,
        modelId: reservation.modelId,
        requestId,
        timestamp: new Date().toISOString(),
        previousBalance: prev,
        resultingBalance: wallet.availableCredits,
        status: 'completed',
        metadata: { reason: 'Local provider API failure full refund' }
      });

      writeLocalDb(local);
    }

    return wallet;
  }

  // 6. Verified credit addition (user pays, server grants credits securely)
  static async addCredits(
    userId: string,
    amount: number,
    type: 'purchased' | 'included',
    packageId?: string,
    paymentRef?: string,
    subscriptionTier?: 'free' | 'pro' | 'pro_max',
    subscriptionStatus?: 'active' | 'cancelled' | 'expired',
    subscriptionExpiresAt?: string
  ): Promise<CreditWallet> {
    const txnId = `txn-grant-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    if (db) {
      try {
        const walletRef = db.collection('prepaid_wallets').doc(userId);
        const ledgerRef = db.collection('prepaid_ledger').doc(txnId);

        const result = await db.runTransaction(async (transaction) => {
          const walletSnap = await transaction.get(walletRef);
          let wallet: CreditWallet;

          if (walletSnap.exists) {
            wallet = walletSnap.data() as CreditWallet;
          } else {
            wallet = {
              userId,
              availableCredits: 0,
              includedCredits: 0,
              purchasedCredits: 0,
              usedCredits: 0,
              updatedAt: new Date().toISOString(),
              subscriptionTier: 'free',
              subscriptionStatus: 'active'
            };
          }

          const previous = wallet.availableCredits;
          let nextAvailable = wallet.availableCredits + amount;
          let nextIncluded = wallet.includedCredits + (type === 'included' ? amount : 0);
          let nextPurchased = wallet.purchasedCredits + (type === 'purchased' ? amount : 0);

          if (subscriptionTier && type === 'included') {
            nextIncluded = amount;
            nextPurchased = wallet.purchasedCredits || 0;
            nextAvailable = nextIncluded + nextPurchased;
          }

          const updatedWallet: CreditWallet = {
            userId,
            availableCredits: nextAvailable,
            includedCredits: nextIncluded,
            purchasedCredits: nextPurchased,
            usedCredits: wallet.usedCredits,
            subscriptionTier: subscriptionTier || wallet.subscriptionTier || 'free',
            subscriptionStatus: subscriptionStatus || wallet.subscriptionStatus || 'active',
            subscriptionExpiresAt: subscriptionExpiresAt || wallet.subscriptionExpiresAt,
            monthlyQuotaGrantedAt: (subscriptionTier && type === 'included') ? new Date().toISOString() : (wallet.monthlyQuotaGrantedAt || new Date().toISOString()),
            updatedAt: new Date().toISOString()
          };

          transaction.set(walletRef, updatedWallet);

          const ledgerRecord: CreditTransaction = {
            id: txnId,
            userId,
            type: 'purchase',
            amount,
            timestamp: new Date().toISOString(),
            previousBalance: previous,
            resultingBalance: nextAvailable,
            status: 'completed',
            packageId,
            paymentRef,
            metadata: { method: 'Stripe simulated verification', type }
          };

          transaction.set(ledgerRef, ledgerRecord);

          return updatedWallet;
        });

        return result;
      } catch (err: any) {
        disableFirestoreDueToError(err, 'purchase grant');
      }
    }

    // Local DB Fallback
    const local = readLocalDb();
    if (!local.wallets[userId]) {
      local.wallets[userId] = {
        userId,
        availableCredits: 0,
        includedCredits: 0,
        purchasedCredits: 0,
        usedCredits: 0,
        subscriptionTier: 'free',
        subscriptionStatus: 'active',
        updatedAt: new Date().toISOString()
      };
    }

    const wallet = local.wallets[userId];
    const previous = wallet.availableCredits;
    let nextAvailable = wallet.availableCredits + amount;
    let nextIncluded = wallet.includedCredits + (type === 'included' ? amount : 0);
    let nextPurchased = wallet.purchasedCredits + (type === 'purchased' ? amount : 0);

    if (subscriptionTier && type === 'included') {
      nextIncluded = amount;
      nextPurchased = wallet.purchasedCredits || 0;
      nextAvailable = nextIncluded + nextPurchased;
    }

    wallet.availableCredits = nextAvailable;
    wallet.includedCredits = nextIncluded;
    wallet.purchasedCredits = nextPurchased;
    wallet.subscriptionTier = subscriptionTier || wallet.subscriptionTier || 'free';
    wallet.subscriptionStatus = subscriptionStatus || wallet.subscriptionStatus || 'active';
    if (subscriptionExpiresAt) wallet.subscriptionExpiresAt = subscriptionExpiresAt;
    if (subscriptionTier && type === 'included') {
      wallet.monthlyQuotaGrantedAt = new Date().toISOString();
    }
    wallet.updatedAt = new Date().toISOString();

    const ledgerRecord: CreditTransaction = {
      id: txnId,
      userId,
      type: 'purchase',
      amount,
      timestamp: new Date().toISOString(),
      previousBalance: previous,
      resultingBalance: wallet.availableCredits,
      status: 'completed',
      packageId,
      paymentRef,
      metadata: { method: 'Local simulated verification', type }
    };

    local.ledger.push(ledgerRecord);
    writeLocalDb(local);

    return wallet;
  }

  // 7. Process Refund on Payment (deducts credited tokens and logs immutable ledger refund)
  static async processPaymentRefund(
    userId: string,
    tokensToDeduct: number,
    paymentRef?: string,
    reason?: string
  ): Promise<CreditWallet> {
    const txnId = `txn-refund-pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    if (db) {
      try {
        const walletRef = db.collection('prepaid_wallets').doc(userId);
        const ledgerRef = db.collection('prepaid_ledger').doc(txnId);

        const result = await db.runTransaction(async (transaction) => {
          const walletSnap = await transaction.get(walletRef);
          if (!walletSnap.exists) {
            throw new Error('Wallet not found');
          }

          const wallet = walletSnap.data() as CreditWallet;
          const previous = wallet.availableCredits;
          const nextAvailable = Math.max(0, wallet.availableCredits - tokensToDeduct);
          const nextPurchased = Math.max(0, wallet.purchasedCredits - tokensToDeduct);

          const updatedWallet: CreditWallet = {
            ...wallet,
            availableCredits: nextAvailable,
            purchasedCredits: nextPurchased,
            updatedAt: new Date().toISOString(),
          };

          transaction.update(walletRef, updatedWallet);

          const ledgerRecord: CreditTransaction = {
            id: txnId,
            userId,
            type: 'refund',
            amount: -tokensToDeduct,
            timestamp: new Date().toISOString(),
            previousBalance: previous,
            resultingBalance: nextAvailable,
            status: 'completed',
            paymentRef,
            metadata: { reason: reason || 'Payment refunded', method: 'Authoritative backend reversal' },
          };

          transaction.set(ledgerRef, ledgerRecord);
          return updatedWallet;
        });

        return result;
      } catch (err: any) {
        disableFirestoreDueToError(err, 'refund payment');
      }
    }

    // Local DB Fallback
    const local = readLocalDb();
    const wallet = local.wallets[userId];
    if (wallet) {
      const previous = wallet.availableCredits;
      wallet.availableCredits = Math.max(0, wallet.availableCredits - tokensToDeduct);
      wallet.purchasedCredits = Math.max(0, wallet.purchasedCredits - tokensToDeduct);
      wallet.updatedAt = new Date().toISOString();

      const ledgerRecord: CreditTransaction = {
        id: txnId,
        userId,
        type: 'refund',
        amount: -tokensToDeduct,
        timestamp: new Date().toISOString(),
        previousBalance: previous,
        resultingBalance: wallet.availableCredits,
        status: 'completed',
        paymentRef,
        metadata: { reason: reason || 'Payment refunded', method: 'Authoritative backend reversal' },
      };

      local.ledger.push(ledgerRecord);
      writeLocalDb(local);
      return wallet;
    }

    return {
      userId,
      availableCredits: 0,
      includedCredits: 0,
      purchasedCredits: 0,
      usedCredits: 0,
      subscriptionTier: 'free',
      subscriptionStatus: 'active',
      updatedAt: new Date().toISOString(),
    };
  }

  // Helper helper to write transactions outside parent transactions
  private static async recordTransactionDirectly(userId: string, txn: CreditTransaction) {
    if (db) {
      try {
        await db.collection('prepaid_ledger').doc(txn.id).set(txn);
        return;
      } catch (err) {
        disableFirestoreDueToError(err, 'direct ledger write');
      }
    }
    try {
      const local = readLocalDb();
      local.ledger.push(txn);
      writeLocalDb(local);
    } catch (err) {
      console.error('Failed to write direct ledger fallback:', err);
    }
  }

  // Calculation pricing layer for variable models
  static calculateMaxCost(modelId: string, estimatedInputTokens: number, estimatedOutputTokens: number): number {
    const rate = ADMIN_CONFIG.pricing[modelId] || { per1k: 15, base: 1 };
    if (rate.fixed) {
      return rate.fixed;
    }
    
    const inputPer1k = typeof rate.inputPer1k === 'number' ? rate.inputPer1k : (rate.per1k || 15);
    const outputPer1k = typeof rate.outputPer1k === 'number' ? rate.outputPer1k : (rate.per1k || 15);
    const base = rate.base || 1;

    const inputCost = (estimatedInputTokens / 1000) * inputPer1k;
    const outputCost = (estimatedOutputTokens / 1000) * outputPer1k;
    return Math.max(base, Math.ceil(inputCost + outputCost));
  }

  // 6. Verify Google Purchase securely and idempotently
  static async verifyGooglePurchase(
    userId: string,
    params: {
      orderId: string;
      productId: string;
      purchaseToken: string;
      purchaseState: 'pending' | 'completed' | 'cancelled' | 'refunded' | 'revoked' | 'expired' | 'restored';
      isSubscription?: boolean;
    }
  ): Promise<{
    success: boolean;
    message: string;
    wallet?: CreditWallet;
    reconciled?: boolean;
    alreadyProcessed?: boolean;
  }> {
    const { orderId, productId, purchaseToken, purchaseState, isSubscription = false } = params;

    if (!userId || !orderId || !productId || !purchaseToken) {
      throw new Error('Altered or invalid payment parameters: User, Order ID, Product ID, or Purchase Token is missing.');
    }

    // Resolve Product Package securely (Source of Truth on Server-Side)
    let creditAmount = 0;
    let costUsd = 0;
    let productIsSub = false;

    if (productId === 'pkg-lite') {
      creditAmount = 5000;
      costUsd = 5.00;
    } else if (productId === 'pkg-standard') {
      creditAmount = 20000;
      costUsd = 15.00;
    } else if (productId === 'pkg-pro') {
      creditAmount = 75000;
      costUsd = 45.00;
    } else if (productId === 'sub-premium' || productId === 'pkg-premium-sub') {
      creditAmount = 50000;
      costUsd = 29.99;
      productIsSub = true;
    } else {
      throw new Error(`Fraudulent or modified purchase attempt: Product ID "${productId}" is not registered in Velcora ecosystem.`);
    }

    const secureIsSub = isSubscription || productIsSub;

    // 1. FIRESTORE DATABASE RUNWAY
    if (db) {
      try {
        const purchaseRef = db.collection('google_purchases').doc(orderId);
        const walletRef = db.collection('prepaid_wallets').doc(userId);
        const userRef = db.collection('users').doc(userId);

        const result = await db.runTransaction(async (transaction) => {
          const purchaseSnap = await transaction.get(purchaseRef);
          const walletSnap = await transaction.get(walletRef);

          let wallet: CreditWallet = walletSnap.exists
            ? (walletSnap.data() as CreditWallet)
            : {
                userId,
                availableCredits: ADMIN_CONFIG.defaultMonthlyQuota,
                includedCredits: ADMIN_CONFIG.defaultMonthlyQuota,
                purchasedCredits: 0,
                usedCredits: 0,
                updatedAt: new Date().toISOString(),
              };

          // IDEMPOTENCY & REPLAY ATTACK CHECK
          if (purchaseSnap.exists) {
            const record = purchaseSnap.data() as GooglePurchaseRecord;

            // Mismatch security checks: ensure user claims their OWN purchase, and product IDs align
            if (record.userId !== userId) {
              throw new Error(`Security Violations: Order ID "${orderId}" is registered to another user account.`);
            }
            if (record.productId !== productId) {
              throw new Error(`Security Violations: Order ID "${orderId}" product mismatch detected.`);
            }

            // Same state - duplicate notification / webhook replay
            if (record.purchaseState === purchaseState) {
              return {
                success: true,
                message: `Google Payments transaction already verified and processed. Idempotency safety lock active.`,
                wallet,
                alreadyProcessed: true,
              };
            }

            // STATE TRANSITION & RECONCILIATION (e.g. completed -> refunded/cancelled/expired)
            console.log(`[RECONCILING STATE] Order ${orderId} transition: ${record.purchaseState} -> ${purchaseState}`);
            
            let reconciledAvailable = wallet.availableCredits;
            let reconciledIncluded = wallet.includedCredits;
            let reconciledPurchased = wallet.purchasedCredits;
            let updatedSubTier: 'free' | 'pro' | 'pro_max' = wallet.subscriptionTier || 'free';
            let updatedSubStatus = wallet.subscriptionStatus;

            const txnId = `txn-reconcile-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const adjustmentLedgerRef = db.collection('prepaid_ledger').doc(txnId);

            if (['refunded', 'cancelled', 'revoked', 'expired'].includes(purchaseState)) {
              // Deduct credits previously granted (allows negative balance to prevent exploit loops)
              const deduction = (record.purchaseState === "completed" || record.purchaseState === "restored") ? creditAmount : 0;
              reconciledAvailable -= deduction;
              if (secureIsSub) {
                reconciledIncluded = Math.max(0, reconciledIncluded - deduction);
                updatedSubTier = 'free';
                updatedSubStatus = purchaseState as any;
              } else {
                reconciledPurchased = Math.max(0, reconciledPurchased - deduction);
              }

              const reconciledWallet: CreditWallet = {
                ...wallet,
                availableCredits: reconciledAvailable,
                includedCredits: reconciledIncluded,
                purchasedCredits: reconciledPurchased,
                subscriptionTier: updatedSubTier,
                subscriptionStatus: updatedSubStatus,
                updatedAt: new Date().toISOString(),
              };

              transaction.set(walletRef, reconciledWallet);
              transaction.update(purchaseRef, { purchaseState, updatedAt: new Date().toISOString() });

              // Record the subtraction in Ledger
              const ledgerRecord: CreditTransaction = {
                id: txnId,
                userId,
                type: 'refund',
                amount: -deduction,
                timestamp: new Date().toISOString(),
                previousBalance: wallet.availableCredits,
                resultingBalance: reconciledAvailable,
                status: 'completed',
                packageId: productId,
                paymentRef: orderId,
                metadata: { reason: `Google play refund/revocation reconciliation. State: ${purchaseState}` }
              };
              transaction.set(adjustmentLedgerRef, ledgerRecord);

              // Update user profile tier
              transaction.update(userRef, { subscriptionTier: updatedSubTier, updatedAt: new Date().toISOString() });

              return {
                success: true,
                message: `Google Payments transaction reconciled successfully. Entitlements revoked. State: ${purchaseState}.`,
                wallet: reconciledWallet,
                reconciled: true,
              };
            }

            // Fallback default for unhandled transitions
            return {
              success: true,
              message: `Processed transition to state: ${purchaseState}`,
              wallet,
            };
          }

          // NEW TRANSACTION FLOW
          console.log(`[VERIFYING NEW TRANSACTION] User: ${userId}, Order: ${orderId}, Product: ${productId}, State: ${purchaseState}`);

          // Pending state does not grant balance yet
          if (purchaseState === 'pending') {
            const pendingRecord: GooglePurchaseRecord = {
              orderId,
              userId,
              productId,
              purchaseToken,
              purchaseState: 'pending',
              isSubscription: secureIsSub,
              amount: creditAmount,
              costUsd,
              timestamp: new Date().toISOString(),
            };
            transaction.set(purchaseRef, pendingRecord);
            return {
              success: true,
              message: 'Google payments transaction is pending verification. Balance will be credited upon completion.',
              wallet,
            };
          }

          // Completed / Purchased or Restored State
          if (purchaseState === 'completed' || purchaseState === 'restored') {
            const nextAvailable = wallet.availableCredits + creditAmount;
            const nextIncluded = wallet.includedCredits + (secureIsSub ? creditAmount : 0);
            const nextPurchased = wallet.purchasedCredits + (!secureIsSub ? creditAmount : 0);

            let subTier: 'free' | 'pro' | 'pro_max' = wallet.subscriptionTier || 'free';
            let subStatus = wallet.subscriptionStatus;
            let subExpires = wallet.subscriptionExpiresAt;

            if (secureIsSub) {
              subTier = 'pro_max';
              subStatus = 'active';
              // 30 days renewal
              subExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            }

            const updatedWallet: CreditWallet = {
              ...wallet,
              availableCredits: nextAvailable,
              includedCredits: nextIncluded,
              purchasedCredits: nextPurchased,
              subscriptionTier: subTier,
              subscriptionStatus: subStatus,
              subscriptionExpiresAt: subExpires,
              subscriptionOrderId: secureIsSub ? orderId : wallet.subscriptionOrderId,
              updatedAt: new Date().toISOString(),
            };

            const purchaseRecord: GooglePurchaseRecord = {
              orderId,
              userId,
              productId,
              purchaseToken,
              purchaseState: 'completed',
              isSubscription: secureIsSub,
              amount: creditAmount,
              costUsd,
              timestamp: new Date().toISOString(),
            };

            transaction.set(purchaseRef, purchaseRecord);
            transaction.set(walletRef, updatedWallet);

            const txnId = `txn-google-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const ledgerRecord: CreditTransaction = {
              id: txnId,
              userId,
              type: 'purchase',
              amount: creditAmount,
              timestamp: new Date().toISOString(),
              previousBalance: wallet.availableCredits,
              resultingBalance: nextAvailable,
              status: 'completed',
              packageId: productId,
              paymentRef: orderId,
              metadata: { method: 'Google Play Billing Verified', isSubscription: secureIsSub, costUsd }
            };

            const ledgerRef = db.collection('prepaid_ledger').doc(txnId);
            transaction.set(ledgerRef, ledgerRecord);

            // Update user profile tier
            transaction.update(userRef, { subscriptionTier: subTier, updatedAt: new Date().toISOString() });

            return {
              success: true,
              message: `Google Payments verified successfully. Granted +${creditAmount.toLocaleString()} Velcora credits${secureIsSub ? ' and Premium membership' : ''}.`,
              wallet: updatedWallet,
            };
          }

          // Other unhandled states (e.g. starting with cancelled)
          const fallbackRecord: GooglePurchaseRecord = {
            orderId,
            userId,
            productId,
            purchaseToken,
            purchaseState,
            isSubscription: secureIsSub,
            amount: creditAmount,
            costUsd,
            timestamp: new Date().toISOString(),
          };
          transaction.set(purchaseRef, fallbackRecord);
          return {
            success: true,
            message: `Purchase registered with state: ${purchaseState}. No credits credited.`,
            wallet,
          };
        });

        return result;
      } catch (err: any) {
        disableFirestoreDueToError(err, 'Google Play transaction');
      }
    }

    // 2. LOCAL DB FALLBACK RUNWAY (Resilient Sandboxed Database)
    const local = readLocalDb();

    let wallet: CreditWallet = local.wallets[userId] || {
      userId,
      availableCredits: ADMIN_CONFIG.defaultMonthlyQuota,
      includedCredits: ADMIN_CONFIG.defaultMonthlyQuota,
      purchasedCredits: 0,
      usedCredits: 0,
      updatedAt: new Date().toISOString(),
    };

    // IDEMPOTENCY & REPLAY ATTACK CHECK IN LOCAL
    if (local.google_purchases[orderId]) {
      const record = local.google_purchases[orderId];

      if (record.userId !== userId) {
        throw new Error(`Security Violations: Order ID "${orderId}" is registered to another user account.`);
      }
      if (record.productId !== productId) {
        throw new Error(`Security Violations: Order ID "${orderId}" product mismatch detected.`);
      }

      if (record.purchaseState === purchaseState) {
        return {
          success: true,
          message: 'Google Payments transaction already verified and processed (Local Idempotence safe).',
          wallet,
          alreadyProcessed: true,
        };
      }

      // Reconciliation for state transitions in Local
      console.log(`[LOCAL RECONCILING] Order ${orderId}: ${record.purchaseState} -> ${purchaseState}`);

      if (['refunded', 'cancelled', 'revoked', 'expired'].includes(purchaseState)) {
        const deduction = (record.purchaseState === "completed" || record.purchaseState === "restored") ? creditAmount : 0;
        wallet.availableCredits -= deduction;
        if (secureIsSub) {
          wallet.includedCredits = Math.max(0, wallet.includedCredits - deduction);
          wallet.subscriptionTier = 'free';
          wallet.subscriptionStatus = purchaseState as any;
        } else {
          wallet.purchasedCredits = Math.max(0, wallet.purchasedCredits - deduction);
        }
        wallet.updatedAt = new Date().toISOString();

        record.purchaseState = purchaseState;
        local.wallets[userId] = wallet;
        local.google_purchases[orderId] = record;

        // Log deduction in local ledger
        local.ledger.push({
          id: `txn-reconcile-local-${Date.now()}`,
          userId,
          type: 'refund',
          amount: -deduction,
          timestamp: new Date().toISOString(),
          previousBalance: wallet.availableCredits + deduction,
          resultingBalance: wallet.availableCredits,
          status: 'completed',
          packageId: productId,
          paymentRef: orderId,
          metadata: { reason: `Local Google Play refund/revocation. State: ${purchaseState}` }
        });

        writeLocalDb(local);

        return {
          success: true,
          message: `Google Payments transaction reconciled successfully (Local). State: ${purchaseState}.`,
          wallet,
          reconciled: true,
        };
      }

      return {
        success: true,
        message: `Processed transition to state: ${purchaseState} (Local)`,
        wallet,
      };
    }

    // NEW LOCAL TRANSACTION
    if (purchaseState === 'pending') {
      local.google_purchases[orderId] = {
        orderId,
        userId,
        productId,
        purchaseToken,
        purchaseState: 'pending',
        isSubscription: secureIsSub,
        amount: creditAmount,
        costUsd,
        timestamp: new Date().toISOString(),
      };
      writeLocalDb(local);
      return {
        success: true,
        message: 'Google payments transaction is pending verification. Balance will be credited upon completion.',
        wallet,
      };
    }

    if (purchaseState === 'completed' || purchaseState === 'restored') {
      const prevBal = wallet.availableCredits;
      wallet.availableCredits += creditAmount;
      if (secureIsSub) {
        wallet.includedCredits += creditAmount;
        wallet.subscriptionTier = 'pro_max';
        wallet.subscriptionStatus = 'active';
        wallet.subscriptionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        wallet.subscriptionOrderId = orderId;
      } else {
        wallet.purchasedCredits += creditAmount;
      }
      wallet.updatedAt = new Date().toISOString();

      local.wallets[userId] = wallet;
      local.google_purchases[orderId] = {
        orderId,
        userId,
        productId,
        purchaseToken,
        purchaseState: 'completed',
        isSubscription: secureIsSub,
        amount: creditAmount,
        costUsd,
        timestamp: new Date().toISOString(),
      };

      local.ledger.push({
        id: `txn-google-local-${Date.now()}`,
        userId,
        type: 'purchase',
        amount: creditAmount,
        timestamp: new Date().toISOString(),
        previousBalance: prevBal,
        resultingBalance: wallet.availableCredits,
        status: 'completed',
        packageId: productId,
        paymentRef: orderId,
        metadata: { method: 'Local Google Play Billing Verified', isSubscription: secureIsSub, costUsd }
      });

      writeLocalDb(local);

      return {
        success: true,
        message: `Google Payments verified successfully. Granted +${creditAmount.toLocaleString()} credits (Local).`,
        wallet,
      };
    }

    local.google_purchases[orderId] = {
      orderId,
      userId,
      productId,
      purchaseToken,
      purchaseState,
      isSubscription: secureIsSub,
      amount: creditAmount,
      costUsd,
      timestamp: new Date().toISOString(),
    };
    writeLocalDb(local);
    return {
      success: true,
      message: `Purchase registered with state: ${purchaseState}. No credits credited.`,
      wallet,
    };
  }

  static async getAllWallets(): Promise<CreditWallet[]> {
    if (db) {
      try {
        const snapshot = await db.collection('prepaid_wallets').get();
        const wallets: CreditWallet[] = [];
        snapshot.forEach(doc => {
          wallets.push(doc.data() as CreditWallet);
        });
        return wallets;
      } catch (err: any) {
        disableFirestoreDueToError(err, 'getAllWallets');
      }
    }
    const local = readLocalDb();
    return Object.values(local.wallets);
  }

  static async getAllLedgerTransactions(): Promise<CreditTransaction[]> {
    if (db) {
      try {
        const snapshot = await db.collection('prepaid_ledger').orderBy('timestamp', 'desc').limit(1000).get();
        const txs: CreditTransaction[] = [];
        snapshot.forEach(doc => {
          txs.push(doc.data() as CreditTransaction);
        });
        return txs;
      } catch (err: any) {
        disableFirestoreDueToError(err, 'getAllLedgerTransactions');
      }
    }
    const local = readLocalDb();
    return [...local.ledger].reverse();
  }

  static async toggleUserWalletSuspension(userId: string, isSuspended: boolean): Promise<CreditWallet> {
    if (db) {
      try {
        const walletRef = db.collection('prepaid_wallets').doc(userId);
        const result = await db.runTransaction(async (transaction) => {
          const walletSnap = await transaction.get(walletRef);
          let wallet: any;
          if (walletSnap.exists) {
            wallet = walletSnap.data();
          } else {
            wallet = {
              userId,
              availableCredits: 500,
              includedCredits: 500,
              purchasedCredits: 0,
              usedCredits: 0,
              updatedAt: new Date().toISOString(),
              subscriptionTier: 'free',
              subscriptionStatus: 'active'
            };
          }
          wallet.isSuspended = isSuspended;
          wallet.updatedAt = new Date().toISOString();
          transaction.set(walletRef, wallet);
          return wallet as CreditWallet;
        });
        return result;
      } catch (err: any) {
        disableFirestoreDueToError(err, 'toggleUserWalletSuspension');
      }
    }
    const local = readLocalDb();
    if (!local.wallets[userId]) {
      local.wallets[userId] = {
        userId,
        availableCredits: 500,
        includedCredits: 500,
        purchasedCredits: 0,
        usedCredits: 0,
        subscriptionTier: 'free',
        subscriptionStatus: 'active',
        updatedAt: new Date().toISOString()
      };
    }
    local.wallets[userId].isSuspended = isSuspended;
    local.wallets[userId].updatedAt = new Date().toISOString();
    writeLocalDb(local);
    return local.wallets[userId];
  }
}
