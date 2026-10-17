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
    reg?.then(() => syncPushSubscription()).catch(() => undefined);
  }, []);

  return null;
}
