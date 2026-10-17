'use client';

import { BellRing } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { usePushNotifications } from '@/lib/push/client';

/**
 * Shown after submitting a request: offers notifications for it.
 * Enabling also follows every request saved in this browser, including the new one.
 */
export default function NotifyPrompt() {
  const { state, busy, enable } = usePushNotifications();

  if (state === 'loading' || state === 'unsupported' || state === 'denied') return null;

  if (state === 'on') {
    return (
      <p className="flex items-center justify-center gap-1.5 text-xs text-primary-700 bg-primary-50 rounded-xl px-3 py-2 mb-5">
        <BellRing className="h-3.5 w-3.5" /> Anda akan diberi notifikasi saat permintaan ini diproses admin.
      </p>
    );
  }

  if (state === 'ios-install') {
    return (
      <p className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 mb-5 text-left">
        Ingin notifikasi saat permintaan diproses? Di iPhone, pasang aplikasi dulu: ketuk tombol
        Bagikan lalu <span className="font-semibold">Tambah ke Layar Utama</span>.
      </p>
    );
  }

  const handleEnable = async () => {
    try {
      await enable();
      toast.success('Notifikasi aktif untuk permintaan ini.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengaktifkan notifikasi.');
    }
  };

  return (
    <div className="bg-primary-50 border border-primary-100 rounded-xl p-3 mb-5 text-left">
      <p className="text-sm font-semibold text-primary-900 flex items-center gap-1.5">
        <BellRing className="h-4 w-4" /> Pantau permintaan ini
      </p>
      <p className="text-xs text-primary-800/80 mt-0.5 mb-2.5">
        Dapatkan notifikasi di perangkat ini saat admin memproses permintaan Anda.
      </p>
      <Button type="button" size="sm" variant="primary" loading={busy} onClick={handleEnable}>
        Aktifkan Notifikasi
      </Button>
    </div>
  );
}
