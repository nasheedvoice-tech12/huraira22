import { collection, addDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { getDevicePlatform, getOrCreateDeviceId } from './deviceManager';

export interface SystemActivityEvent {
  id?: string;
  timestamp: string;
  type: 'AUTH' | 'FEATURE_USAGE' | 'TRANSACTION' | 'REFERRAL' | 'SYSTEM_ERROR' | 'SECURITY';
  action: string;
  userId?: string;
  userEmail?: string;
  businessId?: string;
  feature?: string;
  details?: string;
  metadata?: Record<string, any>;
  deviceInfo?: {
    deviceId: string;
    platform: string;
    browser: string;
    screenResolution?: string;
  };
}

export function getBrowserName(): string {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('SamsungBrowser')) return 'Samsung Internet';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  if (ua.includes('Trident')) return 'Internet Explorer';
  if (ua.includes('Edge') || ua.includes('Edg')) return 'Microsoft Edge';
  if (ua.includes('Chrome')) return 'Google Chrome';
  if (ua.includes('Safari')) return 'Apple Safari';
  return 'Web Browser';
}

export function getClientDeviceMetadata() {
  if (typeof window === 'undefined') {
    return {
      deviceId: 'server',
      platform: 'Server',
      browser: 'Node',
      screenResolution: '0x0',
    };
  }

  return {
    deviceId: getOrCreateDeviceId(),
    platform: getDevicePlatform(),
    browser: getBrowserName(),
    screenResolution: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
  };
}

/**
 * Log real-time system activity asynchronously without blocking the UI
 */
export async function logSystemActivity(event: Omit<SystemActivityEvent, 'timestamp' | 'deviceInfo'> & { metadata?: Record<string, any> }): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    const deviceInfo = getClientDeviceMetadata();
    const userId = event.userId || auth?.currentUser?.uid || 'anonymous';
    const userEmail = event.userEmail || auth?.currentUser?.email || undefined;

    const fullEvent: SystemActivityEvent = {
      ...event,
      timestamp,
      userId,
      userEmail,
      deviceInfo,
    };

    // 1. Non-blocking push to Firestore system_activity
    addDoc(collection(db, 'system_activity'), fullEvent).catch((err) => {
      console.warn('Telemetry event capture note:', err?.message || err);
    });

    // 2. Also keep a lightweight local buffer for offline/immediate access
    try {
      const LOCAL_LOGS_KEY = 'velcora_activity_buffer';
      const existing = localStorage.getItem(LOCAL_LOGS_KEY);
      const list: SystemActivityEvent[] = existing ? JSON.parse(existing) : [];
      list.unshift(fullEvent);
      if (list.length > 50) list.pop();
      localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(list));
    } catch (_) {}
  } catch (err) {
    // Fail silently to never disrupt application performance
  }
}

/**
 * Track user module/feature engagement
 */
export function trackFeatureUsage(featureName: string, details?: string, metadata?: Record<string, any>): void {
  logSystemActivity({
    type: 'FEATURE_USAGE',
    action: `OPEN_${featureName.toUpperCase()}`,
    feature: featureName,
    details: details || `User navigated to ${featureName}`,
    metadata,
  });
}

/**
 * Track application errors and exceptions for Admin health monitoring
 */
export function logSystemError(error: Error | string, context: string, userId?: string, metadata?: Record<string, any>): void {
  const errorMessage = typeof error === 'string' ? error : error?.message || 'Unknown error';
  const errorStack = typeof error !== 'string' ? error?.stack : undefined;

  logSystemActivity({
    type: 'SYSTEM_ERROR',
    action: 'CLIENT_EXCEPTION',
    userId,
    feature: context,
    details: errorMessage,
    metadata: {
      ...metadata,
      stack: errorStack?.slice(0, 500),
      context,
    },
  });
}

/**
 * Maintain online presence heartbeat for real-time online user calculation
 */
export async function updateUserHeartbeat(userId: string, email?: string, businessId?: string): Promise<void> {
  if (!userId || userId === 'anonymous') return;
  const now = new Date().toISOString();
  const deviceInfo = getClientDeviceMetadata();

  try {
    const userRef = doc(db, 'users', userId);
    const payload: Record<string, any> = {
      lastActiveAt: now,
      updatedAt: now,
      deviceInfo,
      platform: deviceInfo.platform,
      browser: deviceInfo.browser,
    };
    if (email) payload.email = email;
    if (businessId) payload.lastActiveBusinessId = businessId;

    await setDoc(userRef, payload, { merge: true }).catch(async () => {
      await updateDoc(userRef, { lastActiveAt: now, updatedAt: now }).catch(() => {});
    });
  } catch (_) {}
}
