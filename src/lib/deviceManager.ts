import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Workstation } from '../types';

const DEVICE_ID_KEY = 'velcora_device_id';
const DEVICE_NAME_KEY = 'velcora_device_name';

export function getOrCreateDeviceId(): string {
  let devId = localStorage.getItem(DEVICE_ID_KEY);
  if (!devId) {
    devId = `dev-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    localStorage.setItem(DEVICE_ID_KEY, devId);
  }
  return devId;
}

export function getDevicePlatform(): string {
  const userAgent = navigator.userAgent;
  if (/Android/i.test(userAgent)) return 'Android Mobile';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS Mobile';
  if (/Macintosh/i.test(userAgent)) return 'macOS Desktop';
  if (/Windows/i.test(userAgent)) return 'Windows PC';
  if (/Linux/i.test(userAgent)) return 'Linux Desktop';
  return 'Web Client';
}

export function getDeviceName(): string {
  const savedName = localStorage.getItem(DEVICE_NAME_KEY);
  if (savedName) return savedName;
  const platform = getDevicePlatform();
  const defaultName = `Terminal (${platform})`;
  return defaultName;
}

export function setCustomDeviceName(name: string): void {
  localStorage.setItem(DEVICE_NAME_KEY, name);
}

const LOCAL_DEVICE_CACHE_KEY = 'velcora_device_cache';

export async function syncAndRegisterDevice(
  businessId: string,
  userUid?: string,
  userName?: string,
  roleId?: string
): Promise<Workstation | null> {
  if (!businessId) return null;

  const deviceId = getOrCreateDeviceId();
  const deviceRef = doc(db, 'businesses', businessId, 'workstations', deviceId);
  const now = new Date().toISOString();

  const isOwnerOrAdmin = roleId === 'role-owner' || roleId === 'role-admin' || !roleId;

  // Build baseline local device snapshot
  const localFallback: Workstation = {
    id: deviceId,
    deviceId: deviceId,
    name: getDeviceName(),
    deviceName: getDeviceName(),
    deviceType: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile_pos' : 'desktop',
    pairingCode: '123456',
    assignedUserId: userUid || 'unassigned',
    assignedUserName: userName || 'Unassigned Operator',
    roleId: roleId || 'role-owner',
    status: navigator.onLine ? 'online' : 'offline',
    lastSyncAt: now,
    createdAt: now,
    businessId,
    registeredBy: userUid || 'system',
    platform: getDevicePlatform(),
    lastSeen: now,
    lastActive: now,
    isAuthorized: isOwnerOrAdmin,
    revokedAt: null,
  };

  // If browser reports offline, don't throw Firestore network errors
  if (!navigator.onLine) {
    try {
      const cached = localStorage.getItem(LOCAL_DEVICE_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as Workstation;
        return { ...parsed, status: 'offline', lastActive: now };
      }
    } catch (_) {}
    return localFallback;
  }

  try {
    const devSnap = await getDoc(deviceRef);
    if (devSnap.exists()) {
      const data = devSnap.data() as Workstation;
      // Update heartbeat
      const updated: Partial<Workstation> = {
        lastSeen: now,
        lastActive: now,
        status: data.revokedAt ? 'locked' : 'online',
        platform: getDevicePlatform(),
      };
      await updateDoc(deviceRef, updated);
      const merged = { ...data, ...updated };
      try { localStorage.setItem(LOCAL_DEVICE_CACHE_KEY, JSON.stringify(merged)); } catch (_) {}
      return merged;
    } else {
      // Register New Device
      const newDevice: Workstation = {
        ...localFallback,
        pairingCode: Math.floor(100000 + Math.random() * 900000).toString(),
      };
      await setDoc(deviceRef, newDevice);
      try { localStorage.setItem(LOCAL_DEVICE_CACHE_KEY, JSON.stringify(newDevice)); } catch (_) {}
      return newDevice;
    }
  } catch (err: any) {
    const errMsg = err?.message || '';
    if (errMsg.includes('offline') || err?.code === 'unavailable' || err?.code === 'failed-precondition') {
      // Handle offline gracefully without noisy console error
      try {
        const cached = localStorage.getItem(LOCAL_DEVICE_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as Workstation;
          return { ...parsed, status: 'offline', lastActive: now };
        }
      } catch (_) {}
      return localFallback;
    }
    console.warn('Workstation device sync note:', err?.message || err);
    return localFallback;
  }
}
