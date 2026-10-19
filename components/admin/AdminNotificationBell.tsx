'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { isPushSupported, isIosNotInstalled, registerServiceWorker } from '@/lib/push/client';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration('/');
  return reg ? reg.pushManager.getSubscription() : null;
}

type PushState = 'loading' | 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on';

async function detectState(): Promise<PushState> {
  if (isIosNotInstalled()) return 'ios-install';
  if (!isPushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const sub = await currentSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

/**
 * Bell toggle for admin devices.
 * Subscribes/unsubscribes via /api/admin/push (protected by admin session).
 * Supports 'icon' (compact) and 'sidebar' (full label row) variants.
 */
export default function AdminNotificationBell({
  variant = 'icon',
}: {
  variant?: 'icon' | 'sidebar';
}) {
  const [state, setState] = useState<PushState>('loading');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    detectState()
      .catch((): PushState => 'unsupported')
      .then((s) => { if (alive) setState(s); });
    return () => { alive = false; };
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'off');
        showToast('Izin notifikasi tidak diberikan.');
        return;
      }
      const reg = (await navigator.serviceWorker.getRegistration('/')) ?? (await registerServiceWorker());
      if (!reg) { showToast('Browser tidak mendukung notifikasi.'); return; }
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));
      const res = await fetch('/api/admin/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        showToast(json.error || 'Gagal mengaktifkan notifikasi.');
        return;
      }
      setState('on');
      showToast('Notifikasi aktif. Admin akan diberitahu saat ada permintaan baru.');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Gagal mengaktifkan notifikasi.');
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const sub = await currentSubscription();
      if (sub) {
        await fetch('/api/admin/push', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => undefined);
        await sub.unsubscribe();
      }
      setState('off');
      showToast('Notifikasi dimatikan di perangkat ini.');
    } finally {
      setBusy(false);
    }
  }, []);

  const handleClick = async () => {
    if (busy) return;
    if (state === 'ios-install') {
      showToast('Di iPhone, pasang app dulu: ketuk Bagikan → "Tambah ke Layar Utama".');
      return;
    }
    if (state === 'denied') {
      showToast('Notifikasi diblokir browser. Izinkan notifikasi untuk situs ini di pengaturan browser.');
      return;
    }
    if (state === 'on') await disable(); else await enable();
  };

  if (state === 'loading' || state === 'unsupported') return null;

  const on  = state === 'on';
  const Icon = on ? BellRing : state === 'denied' ? BellOff : Bell;
  const label = on ? 'Notifikasi aktif' : 'Aktifkan notifikasi';

  return (
    <div className="relative">
      {/* In-page toast (no external lib needed in admin) */}
      {toast && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 z-50 shadow-lg pointer-events-none text-center">
          {toast}
        </div>
      )}

      {variant === 'sidebar' ? (
        <button
          type="button"
          onClick={handleClick}
          disabled={busy}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 w-full transition-all disabled:opacity-50"
        >
          <Icon className={cn('h-4 w-4 flex-shrink-0', on ? 'text-primary-400' : 'text-gray-400')} />
          <span className="flex-1 text-left">Notifikasi</span>
          <div className="flex items-center gap-1.5">
            {on && (
              <span
                role="button"
                tabIndex={0}
                onClick={async (e) => {
                  e.stopPropagation();
                  showToast('Mengirim tes notifikasi...');
                  try {
                    const res = await fetch('/api/admin/push?test=1');
                    const json = await res.json();
                    if (json.test_results?.[0]?.ok) {
                      showToast('Tes notifikasi terkirim!');
                    } else if (json.config_error) {
                      showToast(`Konfigurasi error: ${json.config_error}`);
                    } else {
                      showToast('Tes notifikasi selesai diproses.');
                    }
                  } catch {
                    showToast('Gagal memicu tes notifikasi.');
                  }
                }}
                className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/40 cursor-pointer transition-colors"
                title="Kirim tes notifikasi ke perangkat ini"
              >
                Tes
              </span>
            )}
            <span className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              on ? 'bg-primary-600/30 text-primary-300' : 'bg-white/10 text-gray-500'
            )}>
              {on ? 'Aktif' : state === 'denied' ? 'Diblokir' : 'Nonaktif'}
            </span>
          </div>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={busy}
          title={label}
          aria-label={label}
          aria-pressed={on}
          className={cn(
            'flex items-center gap-1.5 p-2 rounded-lg text-sm transition-colors disabled:opacity-50',
            on ? 'text-primary-300 bg-primary-600/20' : 'text-gray-400 hover:text-white hover:bg-white/10'
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
