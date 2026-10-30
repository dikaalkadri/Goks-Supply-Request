'use client';

import { useEffect } from 'react';
import { registerServiceWorker, syncPushSubscription } from '@/lib/push/client';

/**
 * Registers the service worker and re-links this device's push subscription
 * to the outlet currently logged in (login/logout do a full page load).
 */
export default function PwaRegistrar() {
  useEffect(() => {
    const reg = registerServiceWorker();
    if (!reg) return;
    reg
      .then((registration) => {
        if (process.env.NODE_ENV === 'development') {
          console.info('[PWA] Service Worker aktif:', registration?.scope);
        }
        return syncPushSubscription();
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker tidak dapat didaftarkan:', err);
      });
  }, []);

  return null;
}
