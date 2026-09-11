import crypto from 'crypto';
import { SubUser, AuditLogEntry, UserRole } from '../types';

// In-memory staff security credential repository (keyed by businessId:staffId)
interface StaffSecurityRecord {
  businessId: string;
  staffId: string;
  subUserId: string;
  name: string;
  roleId: string;
  roleName: string;
  passwordHash: string;
  passwordSalt: string;
  pinCode: string;
  isActive: boolean;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

// In-memory persistent state across requests
const staffCredentialsMap = new Map<string, StaffSecurityRecord>();
const auditLogsStore: AuditLogEntry[] = [];

// Helper to hash password with salt
export function hashPasswordWithSalt(password: string, salt: string): string {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Pre-populate default credentials for demo/seed data
function seedDefaultCredentials() {
  const seedUsers = [
    { businessId: 'biz-clothing-01', staffId: 'OWN-001', subUserId: 'user-owner', name: 'Ali (Store Owner)', roleId: 'role-owner', roleName: 'Master Admin', pin: '1234', pass: 'Admin123!' },
    { businessId: 'biz-clothing-01', staffId: 'MGR-001', subUserId: 'user-manager-1', name: 'Alex Rivera', roleId: 'role-manager', roleName: 'Store Manager', pin: '7788', pass: 'Manager123!' },
    { businessId: 'biz-clothing-01', staffId: 'STF-001', subUserId: 'user-cashier-1', name: 'Emma Watson', roleId: 'role-cashier', roleName: 'Lead Cashier', pin: '4321', pass: 'Staff123!' },
    { businessId: 'biz-clothing-01', staffId: 'STF-002', subUserId: 'user-sales-2', name: 'David Chen', roleId: 'role-sales-assoc', roleName: 'Sales Associate', pin: '2468', pass: 'Staff123!' },
    { businessId: 'biz-clothing-01', staffId: 'INV-001', subUserId: 'user-inv-1', name: 'Marcus Miller', roleId: 'role-inventory', roleName: 'Inventory Specialist', pin: '9021', pass: 'Inventory123!' },
    { businessId: 'biz-clothing-01', staffId: 'ACC-001', subUserId: 'user-acc-1', name: 'Sarah Jenkins', roleId: 'role-accountant', roleName: 'Financial Accountant', pin: '5544', pass: 'Accountant123!' },
  ];

  for (const u of seedUsers) {
    const key = `${u.businessId}:${u.staffId.toUpperCase()}`;
    if (!staffCredentialsMap.has(key)) {
      const salt = generateSalt();
      staffCredentialsMap.set(key, {
        businessId: u.businessId,
        staffId: u.staffId.toUpperCase(),
        subUserId: u.subUserId,
        name: u.name,
        roleId: u.roleId,
        roleName: u.roleName,
        passwordSalt: salt,
        passwordHash: hashPasswordWithSalt(u.pass, salt),
        pinCode: u.pin,
        isActive: true,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // Seed initial audit log entries
  if (auditLogsStore.length === 0) {
    const initialLogs: AuditLogEntry[] = [
      {
        id: 'log-001',
        businessId: 'biz-clothing-01',
        staffId: 'OWN-001',
        staffName: 'Ali (Store Owner)',
        roleId: 'role-owner',
        action: 'WORKSTATION_AUTHORIZED',
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        deviceId: 'dev-reg-01',
        deviceName: 'Front Register 1 (Main Entrance)',
        details: 'Terminal registered and authorized for front desk POS checkout',
        severity: 'info',
      },
      {
        id: 'log-002',
        businessId: 'biz-clothing-01',
        staffId: 'OWN-001',
        staffName: 'Ali (Store Owner)',
        roleId: 'role-owner',
        action: 'SUBUSER_CREATED',
        timestamp: new Date(Date.now() - 3600000 * 20).toISOString(),
        deviceId: 'dev-manager-01',
        deviceName: 'Backoffice Manager PC',
        details: 'Created Store Manager account (Staff ID: MGR-001) for Alex Rivera',
        severity: 'info',
      },
      {
        id: 'log-003',
        businessId: 'biz-clothing-01',
        staffId: 'MGR-001',
        staffName: 'Alex Rivera',
        roleId: 'role-manager',
        action: 'STOCK_ADJUSTED',
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
        deviceId: 'dev-manager-01',
        deviceName: 'Backoffice Manager PC',
        details: 'Audited inventory for Italian Silk Blazer (+5 units received from supplier)',
        severity: 'info',
      },
      {
        id: 'log-004',
        businessId: 'biz-clothing-01',
        staffId: 'STF-001',
        staffName: 'Emma Watson',
        roleId: 'role-cashier',
        action: 'LOGIN',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        deviceId: 'dev-reg-01',
        deviceName: 'Front Register 1 (Main Entrance)',
        details: 'Staff authenticated via Staff ID & Password on Terminal #1',
        severity: 'info',
      },
    ];
    auditLogsStore.push(...initialLogs);
  }
}

seedDefaultCredentials();

/**
 * Generate sequential unique Staff ID based on role prefix
 */
export function generateStaffId(roleId: string, existingStaffIds: string[]): string {
  let prefix = 'STF';
  if (roleId.includes('manager') || roleId.includes('admin')) {
    prefix = 'MGR';
  } else if (roleId.includes('inventory') || roleId.includes('stock')) {
    prefix = 'INV';
  } else if (roleId.includes('accountant') || roleId.includes('finance')) {
    prefix = 'ACC';
  } else if (roleId.includes('owner')) {
    prefix = 'OWN';
  }

  // Find highest index for this prefix
  let maxIndex = 0;
  const regex = new RegExp(`^${prefix}-(\\d+)$`, 'i');
  for (const sid of existingStaffIds) {
    const match = sid.trim().match(regex);
    if (match) {
      const idx = parseInt(match[1], 10);
      if (!isNaN(idx) && idx > maxIndex) {
        maxIndex = idx;
      }
    }
  }

  const nextNum = String(maxIndex + 1).padStart(3, '0');
  return `${prefix}-${nextNum}`;
}

/**
 * Authenticate Staff by Business ID, Staff ID and Password or PIN
 */
export function authenticateStaff(
  businessIdOrParams: string | { businessId: string; staffId: string; password?: string; pinCode?: string; secret?: string; mode?: 'pin' | 'password'; deviceId?: string; deviceName?: string },
  staffIdParam?: string,
  passwordParam?: string,
  pinCodeParam?: string,
  deviceIdParam: string = 'unknown-device',
  deviceNameParam: string = 'Web Terminal'
): { success: boolean; staff?: SubUser; user?: SubUser; token?: string; error?: string } {
  seedDefaultCredentials();

  let businessId: string;
  let staffId: string;
  let password: string | undefined;
  let pinCode: string | undefined;
  let deviceId: string = 'unknown-device';
  let deviceName: string = 'Web Terminal';

  if (typeof businessIdOrParams === 'object' && businessIdOrParams !== null) {
    businessId = businessIdOrParams.businessId;
    staffId = businessIdOrParams.staffId;
    deviceId = businessIdOrParams.deviceId || 'unknown-device';
    deviceName = businessIdOrParams.deviceName || 'Web Terminal';
    
    if (businessIdOrParams.mode === 'pin') {
      pinCode = businessIdOrParams.secret || businessIdOrParams.pinCode;
    } else {
      password = businessIdOrParams.secret || businessIdOrParams.password;
      pinCode = businessIdOrParams.pinCode;
    }
  } else {
    businessId = businessIdOrParams as string;
    staffId = staffIdParam || '';
    password = passwordParam;
    pinCode = pinCodeParam;
    deviceId = deviceIdParam;
    deviceName = deviceNameParam;
  }

  const normalizedStaffId = (staffId || '').trim().toUpperCase();
  const normalizedBizId = (businessId || '').trim() || 'biz-clothing-01';

  // Search by exact key or by staffId across the business
  let record = staffCredentialsMap.get(`${normalizedBizId}:${normalizedStaffId}`);

  if (!record) {
    // Fallback search across map
    for (const [, val] of staffCredentialsMap.entries()) {
      if (
        val.businessId === normalizedBizId &&
        val.staffId.toUpperCase() === normalizedStaffId
      ) {
        record = val;
        break;
      }
    }
  }

  if (!record) {
    // Record login failure audit
    recordAuditLog(normalizedBizId, {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      businessId: normalizedBizId,
      staffId: normalizedStaffId,
      staffName: 'Unknown Staff',
      roleId: 'unknown',
      action: 'LOGIN_FAILED',
      timestamp: new Date().toISOString(),
      deviceId,
      deviceName,
      details: `Failed login attempt: Staff ID '${normalizedStaffId}' not found for business '${normalizedBizId}'`,
      severity: 'warning',
    });

    return {
      success: false,
      error: `Staff ID '${normalizedStaffId}' not found. Please verify with your Business Admin.`,
    };
  }

  if (!record.isActive || record.status === 'suspended') {
    recordAuditLog(normalizedBizId, {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      businessId: normalizedBizId,
      staffId: record.staffId,
      staffName: record.name,
      roleId: record.roleId,
      action: 'LOGIN_FAILED',
      timestamp: new Date().toISOString(),
      deviceId,
      deviceName,
      details: `Suspended staff account attempted login (${record.staffId})`,
      severity: 'security',
    });

    return {
      success: false,
      error: 'This staff account has been suspended by the Business Owner / Admin.',
    };
  }

  // Validate Password or PIN
  let isValid = false;
  if (password) {
    const computedHash = hashPasswordWithSalt(password, record.passwordSalt);
    isValid = computedHash === record.passwordHash;
  } else if (pinCode) {
    isValid = pinCode === record.pinCode;
  }

  if (!isValid) {
    recordAuditLog(normalizedBizId, {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      businessId: normalizedBizId,
      staffId: record.staffId,
      staffName: record.name,
      roleId: record.roleId,
      action: 'LOGIN_FAILED',
      timestamp: new Date().toISOString(),
      deviceId,
      deviceName,
      details: `Invalid password entered for Staff ID ${record.staffId}`,
      severity: 'warning',
    });

    return {
      success: false,
      error: 'Invalid password. Please check your credentials or request a password reset from Admin.',
    };
  }

  // Generate Session Token
  const token = `vst_${record.staffId}_${Date.now().toString(36)}_${crypto.randomBytes(8).toString('hex')}`;

  // Record successful login audit log
  recordAuditLog(normalizedBizId, {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    businessId: normalizedBizId,
    staffId: record.staffId,
    staffName: record.name,
    roleId: record.roleId,
    action: 'LOGIN',
    timestamp: new Date().toISOString(),
    deviceId,
    deviceName,
    details: `Staff member ${record.name} (${record.staffId} - ${record.roleName}) logged in successfully`,
    severity: 'info',
  });

  const staffUser: SubUser = {
    id: record.subUserId,
    businessId: record.businessId,
    staffId: record.staffId,
    name: record.name,
    email: `${record.staffId.toLowerCase()}@${normalizedBizId}.velcora.pos`,
    roleId: record.roleId,
    roleName: record.roleName,
    pinCode: record.pinCode,
    isActive: record.isActive,
    status: record.status,
    lastLoginAt: new Date().toISOString(),
    createdAt: record.createdAt,
  };

  return {
    success: true,
    staff: staffUser,
    user: staffUser,
    token,
  };
}

/**
 * Register or update staff member credentials
 */
export function registerStaffCredentials(
  businessIdOrParams: string | { businessId: string; subUser?: SubUser; staffId?: string; subUserId?: string; name?: string; roleId?: string; roleName?: string; password?: string; pinCode?: string; isActive?: boolean; status?: string },
  subUserParam?: SubUser,
  passwordParam?: string
): { success: boolean; staffId: string } {
  seedDefaultCredentials();

  let businessId: string;
  let subUser: Partial<SubUser>;
  let password: string | undefined;

  if (typeof businessIdOrParams === 'object' && businessIdOrParams !== null) {
    businessId = businessIdOrParams.businessId;
    password = businessIdOrParams.password;
    if (businessIdOrParams.subUser) {
      subUser = businessIdOrParams.subUser;
    } else {
      subUser = {
        id: businessIdOrParams.subUserId || `user-${Date.now()}`,
        businessId: businessIdOrParams.businessId,
        staffId: businessIdOrParams.staffId,
        name: businessIdOrParams.name || 'Staff Member',
        roleId: businessIdOrParams.roleId || 'role-cashier',
        roleName: businessIdOrParams.roleName || 'Cashier',
        pinCode: businessIdOrParams.pinCode || '1234',
        isActive: businessIdOrParams.isActive !== false,
        status: (businessIdOrParams.status as any) || 'active',
      };
    }
  } else {
    businessId = businessIdOrParams as string;
    subUser = subUserParam || {};
    password = passwordParam;
  }

  const normalizedBizId = businessId || 'biz-clothing-01';
  const staffId = (subUser.staffId || generateStaffId(subUser.roleId || 'role-cashier', getAllStaffIds(normalizedBizId))).toUpperCase();

  const key = `${normalizedBizId}:${staffId}`;
  const existing = staffCredentialsMap.get(key);

  const salt = existing ? existing.passwordSalt : generateSalt();
  const passToHash = password || (existing ? null : 'Velcora2026!');
  const passwordHash = passToHash ? hashPasswordWithSalt(passToHash, salt) : (existing?.passwordHash || hashPasswordWithSalt('Velcora2026!', salt));

  staffCredentialsMap.set(key, {
    businessId: normalizedBizId,
    staffId,
    subUserId: subUser.id || `user-${Date.now()}`,
    name: subUser.name || 'Staff Member',
    roleId: subUser.roleId || 'role-cashier',
    roleName: subUser.roleName || 'Cashier',
    passwordSalt: salt,
    passwordHash,
    pinCode: subUser.pinCode || '1234',
    isActive: subUser.isActive !== false,
    status: subUser.status || (subUser.isActive === false ? 'suspended' : 'active'),
    createdAt: subUser.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return { success: true, staffId };
}

/**
 * Reset staff password by Admin/Owner
 */
export function resetStaffPasswordByAdmin(
  businessId: string,
  staffId: string,
  newPassword: string,
  adminStaffId: string = 'OWN-001',
  adminName: string = 'Business Owner',
  deviceId: string = 'admin-terminal'
): { success: boolean; message: string } {
  seedDefaultCredentials();
  const normalizedBizId = businessId || 'biz-clothing-01';
  const normalizedStaffId = staffId.trim().toUpperCase();
  const key = `${normalizedBizId}:${normalizedStaffId}`;

  const record = staffCredentialsMap.get(key);
  if (!record) {
    return { success: false, message: `Staff member with ID '${normalizedStaffId}' not found.` };
  }

  const salt = generateSalt();
  record.passwordSalt = salt;
  record.passwordHash = hashPasswordWithSalt(newPassword, salt);
  record.updatedAt = new Date().toISOString();
  staffCredentialsMap.set(key, record);

  recordAuditLog(normalizedBizId, {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    businessId: normalizedBizId,
    staffId: adminStaffId,
    staffName: adminName,
    roleId: 'role-owner',
    action: 'PASSWORD_RESET',
    timestamp: new Date().toISOString(),
    deviceId,
    deviceName: 'Admin Security Console',
    details: `Password reset by Admin (${adminStaffId}) for Staff Member ${record.name} (${record.staffId})`,
    severity: 'security',
  });

  return { success: true, message: `Password successfully updated for ${record.name} (${record.staffId}).` };
}

/**
 * Update staff activation status
 */
export function updateStaffStatusByAdmin(
  businessId: string,
  staffId: string,
  statusOrActive: boolean | string,
  adminStaffId: string = 'OWN-001',
  adminName: string = 'Business Owner'
): { success: boolean; message: string } {
  seedDefaultCredentials();
  const normalizedBizId = businessId || 'biz-clothing-01';
  const normalizedStaffId = staffId.trim().toUpperCase();
  const key = `${normalizedBizId}:${normalizedStaffId}`;

  const record = staffCredentialsMap.get(key);
  if (!record) {
    return { success: false, message: `Staff ID '${normalizedStaffId}' not found.` };
  }

  const isActuallyActive = typeof statusOrActive === 'boolean'
    ? statusOrActive
    : statusOrActive === 'active';

  record.isActive = isActuallyActive;
  record.status = isActuallyActive ? 'active' : 'suspended';
  record.updatedAt = new Date().toISOString();
  staffCredentialsMap.set(key, record);

  recordAuditLog(normalizedBizId, {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    businessId: normalizedBizId,
    staffId: adminStaffId,
    staffName: adminName,
    roleId: 'role-owner',
    action: 'SUBUSER_UPDATED',
    timestamp: new Date().toISOString(),
    deviceId: 'admin-console',
    deviceName: 'Admin Security Console',
    details: `Staff member ${record.name} (${record.staffId}) marked as ${isActuallyActive ? 'ACTIVE' : 'SUSPENDED'} by Admin ${adminStaffId}`,
    severity: isActuallyActive ? 'info' : 'security',
  });

  return {
    success: true,
    message: `Staff member ${record.name} (${record.staffId}) is now ${isActuallyActive ? 'active' : 'suspended'}.`,
  };
}

/**
 * Record an audit log event
 */
export function recordAuditLog(businessId: string, log: AuditLogEntry): AuditLogEntry {
  const fullLog: AuditLogEntry = {
    ...log,
    id: log.id || `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    businessId: businessId || log.businessId || 'biz-clothing-01',
    timestamp: log.timestamp || new Date().toISOString(),
  };

  auditLogsStore.unshift(fullLog);

  // Keep store capped to 1000 items in memory
  if (auditLogsStore.length > 1000) {
    auditLogsStore.splice(1000);
  }

  return fullLog;
}

/**
 * Get filtered audit logs
 */
export function getAuditLogs(
  businessId: string,
  filters?: {
    staffId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    deviceId?: string;
    limit?: number;
  }
): AuditLogEntry[] {
  seedDefaultCredentials();
  const normalizedBizId = businessId || 'biz-clothing-01';

  let results = auditLogsStore.filter(l => l.businessId === normalizedBizId);

  if (filters?.staffId) {
    const sId = filters.staffId.trim().toUpperCase();
    results = results.filter(l => l.staffId.toUpperCase() === sId);
  }

  if (filters?.action && filters.action !== 'ALL') {
    results = results.filter(l => l.action === filters.action);
  }

  if (filters?.deviceId) {
    results = results.filter(l => l.deviceId === filters.deviceId);
  }

  if (filters?.startDate) {
    const start = new Date(filters.startDate).getTime();
    results = results.filter(l => new Date(l.timestamp).getTime() >= start);
  }

  if (filters?.endDate) {
    const end = new Date(filters.endDate).getTime();
    results = results.filter(l => new Date(l.timestamp).getTime() <= end);
  }

  const limit = filters?.limit || 200;
  return results.slice(0, limit);
}

/**
 * Get list of all registered staff IDs for a business
 */
export function getAllStaffIds(businessId: string): string[] {
  seedDefaultCredentials();
  const ids: string[] = [];
  const normalizedBizId = businessId || 'biz-clothing-01';

  for (const [, val] of staffCredentialsMap.entries()) {
    if (val.businessId === normalizedBizId) {
      ids.push(val.staffId);
    }
  }

  return ids;
}
