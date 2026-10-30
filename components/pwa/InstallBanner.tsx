'use client';

import { useEffect, useState } from 'react';
import { Download, X, Share, Copy, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { isIosDevice, isStandalone } from '@/lib/push/client';

const DISMISS_KEY = 'pwa_install_dismissed_at';
const DISMISS_DAYS = 3;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>;
}

declare global {
  interface Window {
    __pwaPrompt?: BeforeInstallPromptEvent | null;
  }
}

function recentlyDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const isForced = window.location.search.includes('install=') || window.location.search.includes('pwa=');
    if (isForced) return false;
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function isInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isSpecificInApp = /FBAN|FBAV|Instagram|Line\/|WhatsApp|MicroMessenger|Snapchat|musical_ly|BytedanceWebview|Twitter|LinkedInApp/i.test(ua);
  const isAndroidWebView = /;\s*wv\)/i.test(ua) || (/Version\/[0-9.]+/i.test(ua) && /Android/i.test(ua) && !/SamsungBrowser/i.test(ua));
  return Boolean(isSpecificInApp || isAndroidWebView);
}

type BannerMode = 'prompt' | 'ios' | 'webview' | 'manual';

export default function InstallBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<BannerMode | null>(null);
  const [hidden, setHidden] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // If running in standalone mode (already installed), never show banner
    if (isStandalone() || recentlyDismissed()) return;

    // 1. Detect In-App Browser (WhatsApp, Instagram, FB, etc.)
    if (isInAppBrowser()) {
      setMode('webview');
      setHidden(false);
      return;
    }

    // 2. Detect iOS / iPad (Safari)
    if (isIosDevice()) {
      setMode('ios');
      setHidden(false);
      return;
    }

    // 3. Check if beforeinstallprompt was captured early in layout.tsx
    if (window.__pwaPrompt) {
      setPromptEvent(window.__pwaPrompt);
      setMode('prompt');
      setHidden(false);
    }

    // 4. Listen for beforeinstallprompt if it fires later
    const onPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvt = e as BeforeInstallPromptEvent;
      window.__pwaPrompt = promptEvt;
      setPromptEvent(promptEvt);
      setMode('prompt');
      setHidden(false);
    };

    const onInstalled = () => {
      setHidden(true);
      window.__pwaPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    // If query string forces install banner on non-iOS non-webview Android/Desktop
    if (window.location.search.includes('install=') && !window.__pwaPrompt) {
      setMode('manual');
      setHidden(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (hidden || !mode) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setHidden(true);
  };

  const install = async () => {
    if (!promptEvent) return;
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        setHidden(true);
      }
    } catch {
      // ignore
    } finally {
      setPromptEvent(null);
      window.__pwaPrompt = null;
    }
  };

  const copyLink = async () => {
    try {
      const url = window.location.origin;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      toast.success('Link disalin! Buka di Google Chrome atau Safari.');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error('Gagal menyalin link.');
    }
  };

  // Render WebView Warning Banner
  if (mode === 'webview') {
    return (
      <div className="bg-amber-600 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle className="h-5 w-5 text-amber-200 flex-shrink-0" />
            <div className="min-w-0 text-xs sm:text-sm">
              <span className="font-semibold block sm:inline">Dibuka di WhatsApp/Sosial Media: </span>
              <span className="text-amber-100">
                Buka di <strong className="text-white">Chrome</strong> atau <strong className="text-white">Safari</strong> agar bisa pasang aplikasi & menerima notifikasi.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={copyLink}
              className="flex items-center gap-1.5 bg-white text-amber-900 font-semibold px-2.5 py-1.5 rounded-lg text-xs hover:bg-amber-50 transition-colors shadow-sm"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin Link'}</span>
            </button>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Tutup"
              className="p-1 rounded-lg hover:bg-white/10 transition-colors text-amber-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render iOS Instructions Banner
  if (mode === 'ios') {
    return (
      <div className="bg-primary-700 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-start sm:items-center justify-between gap-3 text-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" className="w-8 h-8 rounded-lg flex-shrink-0 mt-0.5 sm:mt-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs sm:text-sm">Pasang di iPhone / iPad:</p>
            <p className="text-xs text-primary-100 mt-0.5 leading-relaxed">
              Ketuk <Share className="inline h-3.5 w-3.5 -mt-0.5 text-white" aria-label="Bagikan" /> <strong>Bagikan</strong> di bilah Safari &rarr; pilih <strong className="text-white">Tambah ke Layar Utama</strong> agar bisa menerima notifikasi.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Tutup"
            className="p-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0 text-white/80 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Render Manual Chrome guide when forced
  if (mode === 'manual') {
    return (
      <div className="bg-primary-700 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" className="w-8 h-8 rounded-lg flex-shrink-0" />
          <p className="flex-1 min-w-0 text-xs sm:text-sm text-primary-100">
            Untuk pasang aplikasi: Ketuk menu titik tiga (<strong className="text-white">⋮</strong>) di Chrome lalu pilih <strong className="text-white">&quot;Pasang aplikasi&quot;</strong> atau <strong className="text-white">&quot;Tambahkan ke Layar Utama&quot;</strong>.
          </p>
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

  // Render Native Prompt Banner (Chrome, Edge, Android)
  return (
    <div className="bg-primary-700 text-white shadow-md">
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-3 text-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" className="w-8 h-8 rounded-lg flex-shrink-0" />
        <p className="flex-1 min-w-0 text-xs sm:text-sm">
          Pasang aplikasi untuk akses cepat dan notifikasi langsung status permintaan.
        </p>
        {promptEvent && (
          <button
            type="button"
            onClick={install}
            className="flex items-center gap-1.5 bg-white text-primary-700 font-semibold px-3 py-1.5 rounded-lg text-xs sm:text-sm hover:bg-primary-50 transition-colors flex-shrink-0 shadow-sm"
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
