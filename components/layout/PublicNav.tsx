'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useOutletSession, resetOutletSessionCache } from '@/lib/auth/use-outlet-session';
import NotificationBell from '@/components/pwa/NotificationBell';
import InstallBanner from '@/components/pwa/InstallBanner';
import OutletMenu from '@/components/layout/OutletMenu';

export default function PublicNav() {
  const pathname = usePathname();
  const { loading, session } = useOutletSession();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    resetOutletSessionCache();
    // Full navigation so every page drops the outlet scope
    window.location.href = '/';
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-gray-900 text-sm hidden sm:block">Goks! Supply Request</span>
          </Link>

          {/* Account actions (main menu lives in PublicMenuCards) */}
          <div className="flex items-center gap-1">
            {/* Logged in: outlet menu (notifications + logout), no Admin link.
                Public: bell, login and Admin link. */}
            {!loading && (session ? (
              <OutletMenu outletName={session.outlet_name} onLogout={handleLogout} />
            ) : (
              <>
                <NotificationBell />
                <Link
                  href="/login"
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ml-1',
                    pathname === '/login'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Masuk</span>
                </Link>
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors ml-1 border border-gray-200"
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              </>
            ))}
          </div>
        </div>
      </div>
      <InstallBanner />
    </nav>
  );
}
