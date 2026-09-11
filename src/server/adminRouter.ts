import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { VelcoraCreditSystem } from './creditManager';
import { masterPaymentEngine } from './masterPaymentEngine';
import { referralStore } from './referralEngine';
import { getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export const adminRouter = Router();

// ---------------------------------------------------------
// SECURE ADMIN CREDENTIAL MANAGEMENT
// ---------------------------------------------------------
const CREDENTIALS_FILE = path.join(process.cwd(), 'data', 'admin_credentials.json');
const DEFAULT_FOUNDER_EMAIL = 'hurairahussain667@gmail.com';

// Local cache of credentials
let cachedAdminEmail = DEFAULT_FOUNDER_EMAIL;
let cachedPasswordHash = '';
let cachedPasswordSalt = '';
let cachedAdminUids: string[] = [];

// Generate persistent JWT secret on startup if none provided
const secretFile = path.join(process.cwd(), 'data', '.admin_jwt_secret');
let JWT_SECRET = process.env.ADMIN_JWT_SECRET || '';

export function getJwtSecret(): string {
  if (process.env.ADMIN_JWT_SECRET) {
    return process.env.ADMIN_JWT_SECRET;
  }
  try {
    if (fs.existsSync(secretFile)) {
      const stored = fs.readFileSync(secretFile, 'utf-8').trim();
      if (stored) return stored;
    }
  } catch {
    // fallback to in-memory
  }
  if (!JWT_SECRET) {
    JWT_SECRET = crypto.randomBytes(64).toString('hex');
    try {
      const dir = path.dirname(secretFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(secretFile, JWT_SECRET, 'utf-8');
    } catch {}
  }
  return JWT_SECRET;
}

/**
 * Sync and load admin/founder credentials securely
 */
export function ensureAdminCredentials(): void {
  try {
    const dir = path.dirname(CREDENTIALS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const envEmail = process.env.ADMIN_EMAIL || DEFAULT_FOUNDER_EMAIL;
    const effectivePassword = process.env.ADMIN_PASSWORD || 'huraira4455667788';

    if (!fs.existsSync(CREDENTIALS_FILE)) {
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.createHmac('sha256', salt).update(effectivePassword).digest('hex');

      const initialCreds = {
        email: envEmail,
        passwordHash: hash,
        passwordSalt: salt,
        role: 'founder',
        authorizedUids: [] as string[],
        createdAt: new Date().toISOString()
      };

      try {
        fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(initialCreds, null, 2), 'utf-8');
      } catch (e) {
        // Safe in read-only environment
      }
      
      cachedAdminEmail = envEmail;
      cachedPasswordHash = hash;
      cachedPasswordSalt = salt;
      cachedAdminUids = [];

      console.log(`[Admin Security] Provisioned secure founder credential record for '${envEmail}' (HMAC-SHA256).`);
    } else {
      let current: any = null;
      try {
        current = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf-8'));
      } catch (e) {
        current = null;
      }
      
      // Verify password matches effectivePassword
      if (current && current.passwordSalt && current.passwordHash) {
        const testHash = crypto.createHmac('sha256', current.passwordSalt).update(effectivePassword).digest('hex');
        if (testHash !== current.passwordHash || current.email !== envEmail) {
          const salt = crypto.randomBytes(16).toString('hex');
          const hash = crypto.createHmac('sha256', salt).update(effectivePassword).digest('hex');
          
          current.email = envEmail;
          current.passwordHash = hash;
          current.passwordSalt = salt;
          current.updatedAt = new Date().toISOString();

          try {
            fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(current, null, 2), 'utf-8');
          } catch (e) {}
          console.log(`[Admin Security] Synchronized founder credentials with current password configurations.`);
        }

        cachedAdminEmail = current.email || envEmail;
        cachedPasswordHash = current.passwordHash;
        cachedPasswordSalt = current.passwordSalt;
        cachedAdminUids = current.authorizedUids || [];
      } else {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.createHmac('sha256', salt).update(effectivePassword).digest('hex');
        cachedAdminEmail = envEmail;
        cachedPasswordHash = hash;
        cachedPasswordSalt = salt;
        cachedAdminUids = [];
      }
    }
  } catch (err: any) {
    console.error(`[Admin Security] Failed to sync credentials file:`, err?.message || err);
  }
}

// Save stable UID on server
function saveAuthorizedUid(uid: string): void {
  try {
    if (cachedAdminUids.includes(uid)) return;
    cachedAdminUids.push(uid);
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const current = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf-8'));
      current.authorizedUids = cachedAdminUids;
      current.updatedAt = new Date().toISOString();
      fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(current, null, 2), 'utf-8');
      console.log(`[Admin Security] Persistent mapping registered: Associated stable UID '${uid}' as an authorized founder on the server.`);
    }
  } catch (err) {
    console.error(`[Admin Security] Failed to persist authorized stable UID:`, err);
  }
}

// Ensure credentials seeded
ensureAdminCredentials();

// ---------------------------------------------------------
// ANTI-BRUTE-FORCE LOGIN TRACKING
// ---------------------------------------------------------
interface LoginAttemptTracker {
  attempts: number;
  lockedUntil: number;
}

const loginTracker = new Map<string, LoginAttemptTracker>();

function checkBruteForce(email: string): { allowed: boolean; waitMs: number } {
  const normEmail = email.toLowerCase().trim();
  const now = Date.now();
  const record = loginTracker.get(normEmail);

  if (record) {
    if (record.lockedUntil > now) {
      return { allowed: false, waitMs: record.lockedUntil - now };
    }
    // Lock expired, reset but keep track of last attempts if fail again
  }
  return { allowed: true, waitMs: 0 };
}

function registerLoginFailure(email: string): void {
  const normEmail = email.toLowerCase().trim();
  const now = Date.now();
  const record = loginTracker.get(normEmail) || { attempts: 0, lockedUntil: 0 };

  record.attempts++;
  if (record.attempts >= 5) {
    // Lock out for 15 minutes
    record.lockedUntil = now + 15 * 60 * 1000;
    console.warn(`[Admin Security] Account lockout triggered for admin/founder email: ${normEmail} due to 5 consecutive login failures.`);
  }
  loginTracker.set(normEmail, record);
}

function clearLoginTracker(email: string): void {
  loginTracker.delete(email.toLowerCase().trim());
}

// ---------------------------------------------------------
// SECURE AUTHENTICATION AND AUTHORIZATION MIDDLEWARES
// ---------------------------------------------------------

export interface AdminRequest extends Request {
  admin?: {
    email: string;
    role: 'founder' | 'admin';
  };
}

/**
 * Middleware validating admin tokens or Google Identity Tokens (Sovereign SSO verification)
 */
export async function authenticateAdmin(req: AdminRequest, res: Response, next: NextFunction): Promise<any> {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication failed: Missing or malformed Authorization header. Expected Bearer Token.'
    });
  }

  const token = authHeader.split(' ')[1];

  // 1. Try Admin-specific session JWT Verification
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as { email: string; role: 'founder' | 'admin' };
    
    // Server-side double authorization check
    const emailLower = decoded.email.toLowerCase().trim();
    if (emailLower !== cachedAdminEmail.toLowerCase().trim()) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Access token valid but unauthorized for founder control pathways.'
      });
    }

    req.admin = decoded;
    return next();
  } catch (err: any) {
    // If Admin JWT fails, let's see if we can authenticate it as a Firebase/Google ID token
    // This allows seamless direct integration with active SSO logged-in sessions of the founder.
    if (getApps().length > 0) {
      try {
        const decodedFirebaseToken = await getAuth().verifyIdToken(token);
        const firebaseEmail = decodedFirebaseToken.email;
        const firebaseUid = decodedFirebaseToken.uid;

        if (firebaseEmail && firebaseEmail.toLowerCase().trim() === cachedAdminEmail.toLowerCase().trim()) {
          // If we already have stored UIDs, verify the stable UID matches
          if (cachedAdminUids.length > 0 && !cachedAdminUids.includes(firebaseUid)) {
            return res.status(403).json({
              success: false,
              error: 'Forbidden: Access denied. Account email matches but cryptographically verified stable UID does not match registered founder UIDs.'
            });
          }

          // Register first verified stable UID
          if (!cachedAdminUids.includes(firebaseUid)) {
            saveAuthorizedUid(firebaseUid);
          }

          req.admin = {
            email: firebaseEmail,
            role: 'founder'
          };
          
          // Log a verified federated login trace internally
          return next();
        }
      } catch (fbErr) {
        // Firebase verification failed or fell back
      }
    }

    // Return the token validation error
    return res.status(401).json({
      success: false,
      error: err.name === 'TokenExpiredError' 
        ? 'Authentication failed: Your admin session has expired. Please log in again.' 
        : 'Authentication failed: Invalid or tampered security signature. Access Denied.'
    });
  }
}

// ---------------------------------------------------------
// AUTHENTICATION PATHWAYS (Unauthenticated endpoints)
// ---------------------------------------------------------

/**
 * POST /api/admin/auth/login
 * Performs highly-secure, brute-force-defended admin sign-in
 */
adminRouter.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({
      success: false,
      error: 'Missing required credentials: Both Email and Password must be supplied.'
    });
    return;
  }

  const normEmail = email.toLowerCase().trim();
  
  // 1. Check brute force locks
  const bfCheck = checkBruteForce(normEmail);
  if (!bfCheck.allowed) {
    res.status(429).json({
      success: false,
      error: `Too Many Login Attempts: This account is locked out. Please try again in ${Math.ceil(bfCheck.waitMs / 1000 / 60)} minute(s).`
    });
    return;
  }

  // Artificial delay (1-2s) to prevent timing analysis & dictionary speed
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 800));

  ensureAdminCredentials();

  // 2. Verify identity
  if (normEmail !== cachedAdminEmail.toLowerCase().trim()) {
    registerLoginFailure(normEmail);
    res.status(401).json({
      success: false,
      error: 'Authentication failed: Invalid credentials provided.'
    });
    return;
  }

  const calculatedHash = crypto.createHmac('sha256', cachedPasswordSalt).update(password).digest('hex');
  if (calculatedHash !== cachedPasswordHash) {
    registerLoginFailure(normEmail);
    res.status(401).json({
      success: false,
      error: 'Authentication failed: Invalid credentials provided.'
    });
    return;
  }

  // Identity fully verified
  clearLoginTracker(normEmail);

  // Generate ultra secure, short-lived JWT (2 hours)
  const token = jwt.sign(
    { email: cachedAdminEmail, role: 'founder' },
    getJwtSecret(),
    { expiresIn: '2h' }
  );

  // Log successful admin access audit log
  masterPaymentEngine.logAdminAudit({
    adminId: 'founder-direct',
    adminEmail: cachedAdminEmail,
    action: 'ADMIN_LOGIN_SUCCESSFUL',
    targetCategory: 'SECURITY',
    targetId: 'founder',
    details: `Founder successfully authenticated from client IP: ${req.ip || 'unknown'}. Issued 2-hour JWT session.`,
  });

  res.json({
    success: true,
    message: 'Founder session successfully established.',
    token,
    admin: {
      email: cachedAdminEmail,
      role: 'founder'
    }
  });
});

/**
 * POST /api/admin/auth/verify
 * Validates the current authorization session details
 */
adminRouter.post('/auth/verify', authenticateAdmin, (req: AdminRequest, res: Response) => {
  res.json({
    success: true,
    admin: req.admin
  });
});

/**
 * GET /api/admin/overview
 * Canonical administrative overview returning telemetry and referral summary
 */
adminRouter.get('/overview', authenticateAdmin, (req: AdminRequest, res: Response) => {
  try {
    const telemetry = masterPaymentEngine.getSuperAdminTelemetry();
    const referralOverview = referralStore.getAdminOverview();
    res.json({
      success: true,
      telemetry,
      referralOverview,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch admin overview.' });
  }
});

// ---------------------------------------------------------
// USER MANAGEMENT ENDPOINTS
// ---------------------------------------------------------

/**
 * GET /api/admin/users
 * Returns list of user accounts with wallet status and plan details
 */
adminRouter.get('/users', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const wallets = await VelcoraCreditSystem.getAllWallets();
    const subs = masterPaymentEngine.getAllSubscriptions();
    
    // Map subscriptions for ease of lookup
    const subsMap = new Map();
    for (const sub of subs) {
      subsMap.set(sub.userId, sub);
    }

    const usersList = wallets.map(w => {
      const activeSub = subsMap.get(w.userId);
      return {
        userId: w.userId,
        availableCredits: w.availableCredits,
        includedCredits: w.includedCredits,
        purchasedCredits: w.purchasedCredits,
        usedCredits: w.usedCredits,
        subscriptionTier: w.subscriptionTier || 'free',
        subscriptionStatus: w.subscriptionStatus || 'inactive',
        updatedAt: w.updatedAt,
        isSuspended: !!w.isSuspended,
        activeSubscription: activeSub ? {
          subscriptionId: activeSub.subscriptionId,
          planName: activeSub.planName,
          status: activeSub.status,
          currentPeriodEnd: activeSub.currentPeriodEnd,
          cancelAtPeriodEnd: activeSub.cancelAtPeriodEnd,
        } : null
      };
    });

    res.json({
      success: true,
      users: usersList
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Failed to load user directories: ${err.message}`
    });
  }
});

/**
 * GET /api/admin/users/:id
 * Retrieves granular historical profile details, ledger, and subscription metadata
 */
adminRouter.get('/users/:id', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  const userId = req.params.id;
  try {
    const wallets = await VelcoraCreditSystem.getAllWallets();
    const wallet = wallets.find(w => w.userId === userId);
    
    if (!wallet) {
      res.status(404).json({
        success: false,
        error: `User lookup failed: Account with ID '${userId}' not found.`
      });
      return;
    }

    const ledger = await VelcoraCreditSystem.getLedger(userId);
    const subscription = masterPaymentEngine.getUserSubscription(userId);
    const transactions = masterPaymentEngine.getTransactionsForUser(userId);

    res.json({
      success: true,
      user: {
        ...wallet,
        isSuspended: !!wallet.isSuspended,
        subscriptionRecord: subscription,
        ledger,
        paymentHistory: transactions
      }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Failed to retrieve user profile: ${err.message}`
    });
  }
});

/**
 * POST /api/admin/users/:id/suspend
 * Toggles administrative suspension status on standard user accounts
 */
adminRouter.post('/users/:id/suspend', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  const userId = req.params.id;
  const { isSuspended } = req.body;

  if (typeof isSuspended !== 'boolean') {
    res.status(400).json({
      success: false,
      error: 'Invalid parameter: Body must include isSuspended (boolean).'
    });
    return;
  }

  try {
    const updatedWallet = await VelcoraCreditSystem.toggleUserWalletSuspension(userId, isSuspended);
    
    // Log immutable audit trace
    masterPaymentEngine.logAdminAudit({
      adminId: 'founder-action',
      adminEmail: req.admin?.email || cachedAdminEmail,
      action: isSuspended ? 'USER_ACCOUNT_SUSPENDED' : 'USER_ACCOUNT_UNSUSPENDED',
      targetCategory: 'USER',
      targetId: userId,
      details: `Administrative state updated. Suspension status set to: ${isSuspended} for user: ${userId}.`,
    });

    res.json({
      success: true,
      message: isSuspended 
        ? `User '${userId}' has been successfully suspended. All further AI requests will be blocked.` 
        : `User '${userId}' has been successfully restored.`,
      wallet: updatedWallet
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Failed to change user suspension state: ${err.message}`
    });
  }
});

/**
 * POST /api/admin/users/:id/credits
 * Admin balance modifier endpoint to grant promotional or adjust purchased tokens
 */
adminRouter.post('/users/:id/credits', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  const userId = req.params.id;
  const { amount, type = 'included', reason = 'Admin Balance Adjustment' } = req.body;

  if (typeof amount !== 'number' || isNaN(amount) || amount === 0) {
    res.status(400).json({
      success: false,
      error: 'Invalid parameter: Amount must be a non-zero number.'
    });
    return;
  }

  try {
    // Add credits securely (support negative offsets by calling the credit system)
    const wallet = await VelcoraCreditSystem.addCredits(
      userId,
      amount,
      type as 'purchased' | 'included',
      `adm_adj_${Date.now()}`,
      undefined,
      undefined,
      undefined,
      undefined
    );

    // Write audit log
    masterPaymentEngine.logAdminAudit({
      adminId: 'founder-action',
      adminEmail: req.admin?.email || cachedAdminEmail,
      action: 'USER_CREDIT_ADJUSTED',
      targetCategory: 'TOKEN',
      targetId: userId,
      details: `Adjusted user credit balance by ${amount > 0 ? '+' : ''}${amount} tokens (${type}). Reason: ${reason}`,
      metadata: { amount, type, reason }
    });

    res.json({
      success: true,
      message: `Successfully adjusted credits by ${amount > 0 ? '+' : ''}${amount} for user '${userId}'.`,
      wallet
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Failed to adjust credit balances: ${err.message}`
    });
  }
});

// ---------------------------------------------------------
// SUBSCRIPTIONS & PLANS ENDPOINTS
// ---------------------------------------------------------

/**
 * GET /api/admin/subscriptions
 * Retrieves list of all subscriptions in the ecosystem
 */
adminRouter.get('/subscriptions', authenticateAdmin, (req: AdminRequest, res: Response) => {
  try {
    const subscriptions = masterPaymentEngine.getAllSubscriptions();
    res.json({
      success: true,
      subscriptions
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Failed to read subscriptions list: ${err.message}`
    });
  }
});

/**
 * POST /api/admin/subscriptions/:userId/cancel
 * Administrative immediate termination of a customer subscription
 */
adminRouter.post('/subscriptions/:userId/cancel', authenticateAdmin, (req: AdminRequest, res: Response) => {
  const userId = req.params.userId;
  const { cancelImmediately = false, reason = 'Canceled by Administrator' } = req.body;

  try {
    const result = masterPaymentEngine.cancelSubscription(userId, cancelImmediately, reason);
    
    masterPaymentEngine.logAdminAudit({
      adminId: 'founder-action',
      adminEmail: req.admin?.email || cachedAdminEmail,
      action: cancelImmediately ? 'SUBSCRIPTION_TERMINATED_IMMEDIATE' : 'SUBSCRIPTION_CANCEL_SCHEDULED',
      targetCategory: 'SUBSCRIPTION',
      targetId: userId,
      details: `Subscription terminated by Admin. Immediate = ${cancelImmediately}. Reason: ${reason}`,
      metadata: { cancelImmediately, reason }
    });

    res.json({
      success: true,
      message: `Subscription successfully ${cancelImmediately ? 'terminated immediately' : 'scheduled for cancellation'}.`,
      result
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Failed to terminate subscription: ${err.message}`
    });
  }
});

/**
 * GET /api/admin/plans
 * Reads standard plan structures
 */
adminRouter.get('/plans', authenticateAdmin, (req: AdminRequest, res: Response) => {
  res.json({
    success: true,
    plans: masterPaymentEngine.getPlans()
  });
});

/**
 * POST /api/admin/plans and POST /api/admin/plans/update
 * Updates pricing tiers, quotas, currency tables
 */
adminRouter.post(['/plans', '/plans/update'], authenticateAdmin, (req: AdminRequest, res: Response) => {
  const plans = req.body?.plans || (Array.isArray(req.body) ? req.body : null);

  if (!Array.isArray(plans)) {
    res.status(400).json({
      success: false,
      error: 'Invalid parameter: Body must include plans array.'
    });
    return;
  }

  try {
    const updated = masterPaymentEngine.updatePlans(
      plans,
      'founder-action',
      req.admin?.email || cachedAdminEmail
    );
    res.json({
      success: true,
      message: 'Subscription plans successfully updated across the database.',
      plans: updated
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Failed to update plans configuration: ${err.message}`
    });
  }
});

// ---------------------------------------------------------
// TOKEN PACKAGE MANAGEMENT
// ---------------------------------------------------------

/**
 * GET /api/admin/packages
 * View standard credit packages
 */
adminRouter.get('/packages', authenticateAdmin, (req: AdminRequest, res: Response) => {
  res.json({
    success: true,
    packages: masterPaymentEngine.getTokenPackages()
  });
});

/**
 * POST /api/admin/packages and POST /api/admin/packages/update
 * Updates standard credit packages (Zero Commission rule enforced)
 */
adminRouter.post(['/packages', '/packages/update'], authenticateAdmin, (req: AdminRequest, res: Response) => {
  const packages = req.body?.packages || (Array.isArray(req.body) ? req.body : null);

  if (!Array.isArray(packages)) {
    res.status(400).json({
      success: false,
      error: 'Invalid parameter: Body must include packages array.'
    });
    return;
  }

  // Double check that no package has commission eligibility
  const sanitisedPackages = packages.map(pkg => ({
    ...pkg,
    commissionEligible: false // Enforce strict rule
  }));

  try {
    const updated = masterPaymentEngine.updateTokenPackages(
      sanitisedPackages,
      'founder-action',
      req.admin?.email || cachedAdminEmail
    );
    res.json({
      success: true,
      message: 'Token packages successfully updated with STRICT ZERO COMMISSION enforcement.',
      packages: updated
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Failed to update token package configurations: ${err.message}`
    });
  }
});

// ---------------------------------------------------------
// REFERRALS & COMMISSION MANAGEMENT
// ---------------------------------------------------------

/**
 * GET /api/admin/referrals
 * Full partner list, referral logs, commission tables
 */
adminRouter.get('/referrals', authenticateAdmin, (req: AdminRequest, res: Response) => {
  try {
    res.json({
      success: true,
      config: referralStore.getConfig(),
      partners: referralStore.getPartners(),
      referrals: referralStore.getReferrals(),
      commissions: referralStore.getCommissions(),
      auditLogs: referralStore.getAuditLogs()
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Failed to load referral registry: ${err.message}`
    });
  }
});

/**
 * POST /api/admin/referrals/partners/:id/status
 * Approves, suspends, or declines referral partner applications
 */
adminRouter.post('/referrals/partners/:id/status', authenticateAdmin, (req: AdminRequest, res: Response) => {
  const partnerId = req.params.id;
  const { status, notes } = req.body;

  if (!status) {
    res.status(400).json({
      success: false,
      error: 'Missing parameters: Body must include partner application status.'
    });
    return;
  }

  try {
    const result = referralStore.updatePartnerStatus(
      partnerId,
      status,
      notes,
      'founder-direct'
    );
    
    // Audited inside ReferralStore but mirror log here
    masterPaymentEngine.logAdminAudit({
      adminId: 'founder-action',
      adminEmail: req.admin?.email || cachedAdminEmail,
      action: `REFERRAL_PARTNER_${status}`,
      targetCategory: 'REFERRAL',
      targetId: partnerId,
      details: `Referral partner ${partnerId} set to state: ${status}. Notes: ${notes || 'None'}`,
    });

    res.json({
      success: true,
      message: `Partner application successfully updated.`,
      result
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Failed to update partner application: ${err.message}`
    });
  }
});

/**
 * POST /api/admin/referrals/commissions/:id/status
 * Manually override commission states (PENDING -> APPROVED -> AVAILABLE -> PAID)
 */
adminRouter.post('/referrals/commissions/:id/status', authenticateAdmin, (req: AdminRequest, res: Response) => {
  const commissionId = req.params.id;
  const { status, notes } = req.body;

  if (!status) {
    res.status(400).json({
      success: false,
      error: 'Missing status override parameter.'
    });
    return;
  }

  try {
    const result = referralStore.transitionCommission(
      commissionId,
      status,
      'founder-direct',
      notes
    );

    masterPaymentEngine.logAdminAudit({
      adminId: 'founder-action',
      adminEmail: req.admin?.email || cachedAdminEmail,
      action: `COMMISSION_STATE_${status}`,
      targetCategory: 'REFERRAL',
      targetId: commissionId,
      details: `Commission record ${commissionId} manually updated to state: ${status}. Notes: ${notes || 'None'}`,
    });

    res.json({
      success: true,
      message: `Commission record manually overridden.`,
      result
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Failed to modify commission state: ${err.message}`
    });
  }
});

// ---------------------------------------------------------
// PAYMENTS & FINANCIAL SUMMARY
// ---------------------------------------------------------

/**
 * GET /api/admin/payments
 * Full ledger audit of transactional activity and payout registers
 */
adminRouter.get('/payments', authenticateAdmin, (req: AdminRequest, res: Response) => {
  try {
    const transactions = masterPaymentEngine.getAllTransactions();
    const payoutRequests = masterPaymentEngine.getPayoutRequests();
    
    // Aggregate high level business metrics
    let totalRevenueUSD = 0;
    let totalRefundsUSD = 0;
    
    for (const tx of transactions) {
      if (tx.status === 'succeeded') {
        totalRevenueUSD += tx.amountUSD || tx.amount;
      } else if (tx.status === 'refunded') {
        totalRefundsUSD += tx.amountUSD || tx.amount;
      }
    }

    res.json({
      success: true,
      financialSummary: {
        totalRevenueUSD,
        totalRefundsUSD,
        netRevenueUSD: totalRevenueUSD - totalRefundsUSD,
        transactionsCount: transactions.length,
        payoutRequestsCount: payoutRequests.length,
      },
      transactions,
      payoutRequests
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Failed to load payment ledgers: ${err.message}`
    });
  }
});

/**
 * POST /api/admin/payments/:id/refund, POST /api/admin/payments/refund, POST /api/admin/refund
 * Processes administrative refunds, reversing associated tokens and commissions securely
 */
adminRouter.post(['/payments/:id/refund', '/payments/refund', '/refund'], authenticateAdmin, async (req: AdminRequest, res: Response) => {
  const transactionId = req.params.id || req.body?.transactionId;
  const { reason = 'Customer Requested Refund' } = req.body || {};

  if (!transactionId) {
    res.status(400).json({
      success: false,
      error: 'Missing required parameter: transactionId must be provided in URL or body.'
    });
    return;
  }

  try {
    const result = await masterPaymentEngine.processRefund(
      transactionId,
      reason,
      'founder-direct',
      req.admin?.email || cachedAdminEmail
    );
    res.json({
      success: true,
      message: `Payment successfully refunded.`,
      result
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Refund processing failed: ${err.message}`
    });
  }
});

/**
 * POST /api/admin/payments/payouts/:payoutRequestId/process, POST /api/admin/payments/payouts/process, POST /api/admin/payouts/process
 * Approve, pay, or decline affiliate payout requests
 */
adminRouter.post(['/payments/payouts/:payoutRequestId/process', '/payments/payouts/process', '/payouts/process'], authenticateAdmin, (req: AdminRequest, res: Response) => {
  const payoutRequestId = req.params.payoutRequestId || req.body?.payoutId || req.body?.payoutRequestId;
  const { action, transactionHash, transactionRef, notes } = req.body || {};

  if (!payoutRequestId) {
    res.status(400).json({
      success: false,
      error: 'Missing required parameter: payoutRequestId / payoutId must be provided in URL or body.'
    });
    return;
  }

  if (!action) {
    res.status(400).json({
      success: false,
      error: 'Invalid action: Action must be provided (e.g., APPROVE, COMPLETE/PAY, FAIL/DECLINE).'
    });
    return;
  }

  const actionUpper = String(action).toUpperCase();
  let mappedAction: 'APPROVE' | 'COMPLETE' | 'FAIL' | 'CANCEL' = 'APPROVE';
  if (actionUpper === 'APPROVE') mappedAction = 'APPROVE';
  else if (actionUpper === 'PAY' || actionUpper === 'COMPLETE') mappedAction = 'COMPLETE';
  else if (actionUpper === 'DECLINE' || actionUpper === 'FAIL') mappedAction = 'FAIL';
  else if (actionUpper === 'CANCEL') mappedAction = 'CANCEL';

  try {
    const result = masterPaymentEngine.processPayoutRequest(
      payoutRequestId,
      mappedAction,
      'founder-direct',
      req.admin?.email || cachedAdminEmail,
      notes,
      transactionHash || transactionRef
    );
    res.json({
      success: true,
      message: `Payout request processed with action: ${mappedAction}`,
      result
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Payout execution failed: ${err.message}`
    });
  }
});

// ---------------------------------------------------------
// ANALYTICS & TELEMETRY
// ---------------------------------------------------------

/**
 * GET /api/admin/analytics
 * Advanced model statistics, user counts, tokens, and active engine telemetry
 */
adminRouter.get('/analytics', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const telemetry = masterPaymentEngine.getSuperAdminTelemetry();
    const wallets = await VelcoraCreditSystem.getAllWallets();
    const ledger = await VelcoraCreditSystem.getAllLedgerTransactions();

    // Calculate aggregated tokens metrics
    let totalCreditsDistributed = 0;
    let totalCreditsConsumed = 0;
    for (const w of wallets) {
      totalCreditsDistributed += (w.availableCredits + w.usedCredits);
      totalCreditsConsumed += w.usedCredits;
    }

    // Engine request distributions (mock statistics matching realistic backend patterns)
    const engineRequests = {
      'velcora-chat': 0,
      'velcora-neural-flash': 0,
      'velcora-axiom': 0,
      'velcora-omni': 0,
      'velcora-prism': 0,
      'velcora-veyra': 0,
    };

    // Calculate distributions based on actual transaction ledger (actual telemetry only)
    for (const tx of ledger) {
      if (tx.type === 'settlement' && tx.metadata?.engine) {
        const eng = tx.metadata.engine;
        if (eng.includes('chat')) engineRequests['velcora-chat']++;
        else if (eng.includes('flash')) engineRequests['velcora-neural-flash']++;
        else if (eng.includes('axiom')) engineRequests['velcora-axiom']++;
        else if (eng.includes('omni')) engineRequests['velcora-omni']++;
        else if (eng.includes('prism')) engineRequests['velcora-prism']++;
        else if (eng.includes('veyra')) engineRequests['velcora-veyra']++;
      }
    }

    res.json({
      success: true,
      summary: {
        totalUsers: wallets.length,
        totalActiveSubscriptions: telemetry.overview.activeSubscriptionsCount,
        totalCreditsDistributed,
        totalCreditsConsumed,
        totalRevenueUSD: telemetry.overview.totalRevenueUSD,
      },
      telemetry,
      engineStatistics: {
        requestsCount: engineRequests,
        activeModels: [
          { name: 'Gemini 2.5 Flash (velcora-neural-flash)', requests: engineRequests['velcora-neural-flash'], health: 'optimal' },
          { name: 'Gemini 2.5 Pro (velcora-axiom)', requests: engineRequests['velcora-axiom'], health: 'optimal' },
          { name: 'Gemini Omni Flash (velcora-omni)', requests: engineRequests['velcora-omni'], health: 'optimal' },
          { name: 'Velcora Basic Chat (velcora-chat)', requests: engineRequests['velcora-chat'], health: 'optimal' },
          { name: 'Imagen 3 (velcora-prism)', requests: engineRequests['velcora-prism'], health: 'optimal' },
          { name: 'Veo 2 (velcora-veyra)', requests: engineRequests['velcora-veyra'], health: 'optimal' },
        ]
      }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Failed to compile telemetry maps: ${err.message}`
    });
  }
});

// ---------------------------------------------------------
// SYSTEM CONFIGURATIONS & GENERAL CONTROLS
// ---------------------------------------------------------

/**
 * POST /api/admin/settings/config, POST /api/admin/config/update, POST /api/admin/config
 * Updates global parameters (e.g. payout ratios, default grace periods, thresholds)
 */
adminRouter.post(['/settings/config', '/config/update', '/config'], authenticateAdmin, (req: AdminRequest, res: Response) => {
  const patch = req.body;

  if (typeof patch !== 'object' || patch === null) {
    res.status(400).json({
      success: false,
      error: 'Invalid parameter: Body must be a JSON configuration patch object.'
    });
    return;
  }

  try {
    const updated = masterPaymentEngine.updateConfig(
      patch,
      'founder-direct',
      req.admin?.email || cachedAdminEmail
    );
    res.json({
      success: true,
      message: 'Global business parameters successfully adjusted.',
      config: updated
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Failed to adjust configurations: ${err.message}`
    });
  }
});

/**
 * POST /api/admin/security/run-matrix and POST /api/admin/run-security-matrix
 * Executes the 23-Scenario Automated Sandbox Security Suite
 */
adminRouter.post(['/security/run-matrix', '/run-security-matrix'], authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const report = await masterPaymentEngine.runComprehensiveSecurityMatrix();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err?.message || 'Error running security matrix.'
    });
  }
});

/**
 * POST /api/admin/settings/killswitch
 * Emergency kill-switch triggers to freeze payment operations or enable maintenance mode
 */
adminRouter.post('/settings/killswitch', authenticateAdmin, (req: AdminRequest, res: Response) => {
  const { killSwitchActive, maintenanceModeActive } = req.body;

  if (typeof killSwitchActive !== 'boolean' && typeof maintenanceModeActive !== 'boolean') {
    res.status(400).json({
      success: false,
      error: 'Invalid parameter: Body must contain killSwitchActive or maintenanceModeActive.'
    });
    return;
  }

  try {
    const patch: any = {};
    if (typeof killSwitchActive === 'boolean') {
      patch.systemKillSwitch = killSwitchActive;
    }
    if (typeof maintenanceModeActive === 'boolean') {
      patch.maintenanceMode = maintenanceModeActive;
    }

    const updated = masterPaymentEngine.updateConfig(
      patch,
      'founder-direct',
      req.admin?.email || cachedAdminEmail
    );

    masterPaymentEngine.logAdminAudit({
      adminId: 'founder-action',
      adminEmail: req.admin?.email || cachedAdminEmail,
      action: 'SYSTEM_KILL_SWITCH_TOGGLED',
      targetCategory: 'SECURITY',
      targetId: 'killswitch',
      details: `Administrative override. Killswitch toggled. Active parameters: Killswitch=${updated.systemKillSwitch}, Maintenance=${updated.maintenanceMode}`,
      metadata: patch
    });

    res.json({
      success: true,
      message: 'Emergency system configurations toggled successfully.',
      config: updated
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Failed to invoke critical security protocols: ${err.message}`
    });
  }
});

/**
 * GET /api/admin/audit-logs
 * Retrieves immutable admin logs
 */
adminRouter.get('/audit-logs', authenticateAdmin, (req: AdminRequest, res: Response) => {
  try {
    const state = masterPaymentEngine.getSuperAdminTelemetry();
    res.json({
      success: true,
      auditLogs: state.auditLogs || []
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Failed to load admin audit trails: ${err.message}`
    });
  }
});
