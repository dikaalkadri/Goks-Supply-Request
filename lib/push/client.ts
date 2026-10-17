'use client';

import { useCallback, useEffect, useState } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    Boolean(VAPID_PUBLIC_KEY)
  );
}

/** iOS only allows web push once the app is added to the home screen. */
export function isIosNotInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  return ios && !window.matchMedia('(display-mode: standalone)').matches;
}

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration('/');
  return reg ? reg.pushManager.getSubscription() : null;
}

function localRequestIds(): string[] {
  try {
    return Object.keys(JSON.parse(localStorage.getItem('request_tokens') ?? '{}'));
  } catch {
    return [];
  }
}

async function saveSubscription(sub: PushSubscription) {
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Also follow requests submitted earlier from this browser
    body: JSON.stringify({ subscription: sub.toJSON(), request_ids: localRequestIds() }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || 'Gagal mengaktifkan notifikasi.');
  }
}

/**
 * Re-send an existing subscription so the server links it to the outlet that
 * is currently logged in (or unlinks it after logout). Safe to call often.
 */
export async function syncPushSubscription() {
  try {
    const sub = await currentSubscription();
    if (sub && Notification.permission === 'granted') await saveSubscription(sub);
  } catch {
    // ignore: sync is best effort
  }
}

/** Follow one request on this device (no-op when notifications are off). */
export async function followRequest(requestId: string) {
  try {
    const sub = await currentSubscription();
    if (!sub) return;
    await fetch('/api/push/follow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint, request_id: requestId }),
    });
  } catch {
    // ignore
  }
}

export type PushState = 'loading' | 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on';

async function detectPushState(): Promise<PushState> {
  if (isIosNotInstalled()) return 'ios-install';
  if (!isPushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const sub = await currentSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

export function usePushNotifications() {
  const [state, setState] = useState<PushState>('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    detectPushState()
      .catch((): PushState => 'unsupported')
      .then((s) => { if (alive) setState(s); });
    return () => { alive = false; };
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'off');
        throw new Error('Izin notifikasi tidak diberikan.');
      }
      const reg = (await navigator.serviceWorker.getRegistration('/')) ?? (await registerServiceWorker());
      if (!reg) throw new Error('Browser tidak mendukung notifikasi.');
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));
      await saveSubscription(sub);
      setState('on');
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const sub = await currentSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => undefined);
        await sub.unsubscribe();
      }
      setState('off');
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, enable, disable };
}
