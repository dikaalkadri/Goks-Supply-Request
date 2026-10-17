'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, Store } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import NotificationBell from '@/components/pwa/NotificationBell';

/** Logged-in outlet chip; opens a menu with the notification toggle and logout. */
export default function OutletMenu({ outletName, onLogout }: { outletName: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative ml-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`Masuk sebagai ${outletName}`}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors',
          'max-w-[10rem] sm:max-w-none'
        )}
      >
        <Store className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">{outletName}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1.5 w-60 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden z-40"
        >
          <div className="px-3 py-2.5 border-b border-gray-100">
            <p className="text-xs text-gray-500">Masuk sebagai</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{outletName}</p>
          </div>
          <NotificationBell variant="menu" />
          <button
            type="button"
            role="menuitem"
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </button>
        </div>
      )}
    </div>
  );
}
