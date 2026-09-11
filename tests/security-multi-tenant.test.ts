import { describe, it, expect } from 'vitest';
import {
  authenticateStaff,
  registerStaffCredentials,
  resetStaffPasswordByAdmin,
  updateStaffStatusByAdmin,
  getAuditLogs,
  recordAuditLog,
  hashPasswordWithSalt,
  generateSalt,
} from '../src/server/staffAuth';

export async function runSecurityMultiTenantTests(): Promise<{ suite: string; total: number; passed: number; failed: number; errors: string[] }> {
  const errors: string[] = [];
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      passed++;
    } else {
      errors.push(`[SecurityMultiTenant] ${msg}`);
    }
  }

  // 1. Password Salt & HMAC Verification (500 iterations with diverse passwords)
  for (let p = 0; p < 500; p++) {
    const rawPass = `SecretPass#${p}_${Date.now()}`;
    const salt1 = generateSalt();
    const salt2 = generateSalt();

    const hash1a = hashPasswordWithSalt(rawPass, salt1);
    const hash1b = hashPasswordWithSalt(rawPass, salt1);
    const hash2 = hashPasswordWithSalt(rawPass, salt2);

    assert(hash1a === hash1b, `Identical salt and password must produce deterministic hash (p:${p})`);
    assert(hash1a !== hash2, `Different salts must produce completely distinct cryptographic hashes (p:${p})`);
  }

  // 2. Register SubUsers across Multiple Isolated Business Entities (200 accounts in Biz A vs Biz B)
  const bizA = 'biz-clothing-01';
  const bizB = 'biz-pharmacy-02';

  for (let u = 1; u <= 100; u++) {
    const staffIdA = `A-STF-${u}`;
    const staffIdB = `B-STF-${u}`;

    const regA = registerStaffCredentials({
      businessId: bizA,
      staffId: staffIdA,
      subUserId: `user-a-${u}`,
      name: `Agent A-${u}`,
      roleId: 'role-cashier',
      roleName: 'Cashier',
      password: `PassA_${u}!`,
      pinCode: `${1000 + u}`,
    });
    assert(regA.success === true, `Registration of Staff ${staffIdA} in Biz A must succeed`);

    const regB = registerStaffCredentials({
      businessId: bizB,
      staffId: staffIdB,
      subUserId: `user-b-${u}`,
      name: `Agent B-${u}`,
      roleId: 'role-cashier',
      roleName: 'Cashier',
      password: `PassB_${u}!`,
      pinCode: `${5000 + u}`,
    });
    assert(regB.success === true, `Registration of Staff ${staffIdB} in Biz B must succeed`);
  }

  // 3. Multi-Tenant Data Isolation Checks (Cross-Tenant Leak Prevention)
  for (let u = 1; u <= 50; u++) {
    const staffIdA = `A-STF-${u}`;
    
    // Attempting to authenticate Biz A's staff under Biz B's domain -> MUST FAIL
    const crossTenantAttempt = authenticateStaff({
      businessId: bizB,
      staffId: staffIdA,
      secret: `${1000 + u}`,
      mode: 'pin',
    });
    assert(crossTenantAttempt.success === false, `Cross-tenant login attempt by ${staffIdA} into ${bizB} MUST be rejected`);

    // Valid authentication within home tenant -> MUST SUCCEED
    const validAttempt = authenticateStaff({
      businessId: bizA,
      staffId: staffIdA,
      secret: `${1000 + u}`,
      mode: 'pin',
    });
    assert(validAttempt.success === true, `Valid login by ${staffIdA} within ${bizA} must succeed`);
    assert(validAttempt.user?.businessId === bizA, `User payload must strictly match tenant businessId`);
  }

  // 4. Inactive / Suspended Account Lockout Enforcement (50 users)
  for (let s = 1; s <= 50; s++) {
    const targetStaffId = `A-STF-${s}`;
    
    // Admin suspends user
    updateStaffStatusByAdmin(bizA, targetStaffId, 'suspended', 'OWN-001');

    // Attempt login while suspended
    const authSuspended = authenticateStaff({
      businessId: bizA,
      staffId: targetStaffId,
      secret: `${1000 + s}`,
      mode: 'pin',
    });
    assert(authSuspended.success === false, `Suspended user ${targetStaffId} must be denied access`);
    assert(authSuspended.error?.toLowerCase().includes('inactive') || authSuspended.error?.toLowerCase().includes('suspended') || authSuspended.error?.toLowerCase().includes('access denied'), `Proper error message on suspended account required`);

    // Admin reactivates user
    updateStaffStatusByAdmin(bizA, targetStaffId, 'active', 'OWN-001');
    const authReactivated = authenticateStaff({
      businessId: bizA,
      staffId: targetStaffId,
      secret: `${1000 + s}`,
      mode: 'pin',
    });
    assert(authReactivated.success === true, `Reactivated user ${targetStaffId} must now authenticate successfully`);
  }

  // 5. Audit Trail Verification
  const auditLogs = getAuditLogs(bizA);
  assert(Array.isArray(auditLogs) && auditLogs.length > 0, `Audit log entries must be recorded and accessible per business tenant`);

  return { suite: 'Security & Multi-Tenant Isolation', total, passed, failed: errors.length, errors };
}

describe('Security & Multi-Tenant Isolation Suite', () => {
  it('passes all multi-tenant isolation, cryptographic hashing, and permission tests', async () => {
    const result = await runSecurityMultiTenantTests();
    expect(result.failed).toBe(0);
    expect(result.passed).toBeGreaterThan(100);
  });
});
