'use client';

import { useEffect, useState } from 'react';
import { Download, X, Share } from 'lucide-react';

const DISMISS_KEY = 'pwa_install_dismissed_at';
const DISMISS_DAYS = 14;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * "Pasang aplikasi" banner. Chrome/Edge/Android: native install prompt.
 * iPhone/iPad: instructions (Safari has no install prompt API).
 */
export default function InstallBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || recentlyDismissed()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      setShowIos(true);
      setHidden(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (hidden) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    setHidden(true);
  };

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice.catch(() => undefined);
    setPromptEvent(null);
    setHidden(true);
  };

  return (
    <div className="bg-primary-700 text-white">
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-3 text-sm">
        <img src="/icon-192.png" alt="" className="w-8 h-8 rounded-lg flex-shrink-0" />
        <p className="flex-1 min-w-0">
          {showIos && !promptEvent ? (
            <>
              Pasang aplikasi: ketuk <Share className="inline h-4 w-4 -mt-0.5" aria-label="Bagikan" /> lalu
              {' '}<span className="font-semibold">Tambah ke Layar Utama</span> agar bisa menerima notifikasi.
            </>
          ) : (
            <>Pasang aplikasi untuk akses cepat dan notifikasi status permintaan.</>
          )}
        </p>
        {promptEvent && (
          <button
            type="button"
            onClick={install}
            className="flex items-center gap-1.5 bg-white text-primary-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-colors flex-shrink-0"
          >
            <Download className="h-4 w-4" /> Pasang
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Tutup"
          className="p-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
