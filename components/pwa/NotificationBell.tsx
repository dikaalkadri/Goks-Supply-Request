'use client';

import { Bell, BellOff, BellRing } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils/cn';
import { usePushNotifications } from '@/lib/push/client';

/**
 * Toggle for push notifications on this device.
 * `icon`: compact navbar button. `menu`: full-width row for a dropdown menu.
 */
export default function NotificationBell({ variant = 'icon' }: { variant?: 'icon' | 'menu' }) {
  const { state, busy, enable, disable } = usePushNotifications();

  if (state === 'loading' || state === 'unsupported') return null;

  const handleClick = async () => {
    if (busy) return;
    if (state === 'ios-install') {
      toast('Di iPhone, pasang aplikasi dulu: ketuk tombol Bagikan lalu "Tambah ke Layar Utama". Setelah itu aktifkan notifikasi dari aplikasi.', { duration: 7000, icon: '📲' });
      return;
    }
    if (state === 'denied') {
      toast.error('Notifikasi diblokir browser. Izinkan notifikasi untuk situs ini di pengaturan browser.', { duration: 6000 });
      return;
    }
    try {
      if (state === 'on') {
        await disable();
        toast.success('Notifikasi dimatikan di perangkat ini.');
      } else {
        await enable();
        toast.success('Notifikasi aktif. Anda akan diberi tahu saat permintaan diproses admin.');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengubah notifikasi.');
    }
  };

  const on = state === 'on';
  const Icon = on ? BellRing : state === 'denied' ? BellOff : Bell;
  const label = on ? 'Notifikasi aktif' : 'Aktifkan notifikasi';

  if (variant === 'menu') {
    const status = on ? 'Aktif' : state === 'denied' ? 'Diblokir' : state === 'ios-install' ? 'Pasang app' : 'Nonaktif';
    return (
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={on}
        onClick={handleClick}
        disabled={busy}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        <Icon className={cn('h-4 w-4', on ? 'text-primary-600' : 'text-gray-400')} />
        <span className="flex-1 text-left">Notifikasi</span>
        <span
          className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            on ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'
          )}
        >
          {status}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      title={label}
      aria-label={label}
      aria-pressed={on}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50',
        on ? 'text-primary-700 bg-primary-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
