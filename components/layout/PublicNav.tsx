'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, List, Shield, LogIn, LogOut, Store } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useOutletSession, resetOutletSessionCache } from '@/lib/auth/use-outlet-session';
import NotificationBell from '@/components/pwa/NotificationBell';
import InstallBanner from '@/components/pwa/InstallBanner';

const navItems = [
  { href: '/',         label: 'Permintaan Barang', icon: ShoppingCart },
  { href: '/requests', label: 'Daftar Permintaan',  icon: List },
];

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

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  pathname === href
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
            <NotificationBell />
            {!loading && (session ? (
              <>
                <span
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium text-primary-700 bg-primary-50 ml-1 max-w-[9rem] sm:max-w-none"
                  title={`Masuk sebagai ${session.outlet_name}`}
                >
                  <Store className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{session.outlet_name}</span>
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Keluar"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </>
            ) : (
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
            ))}
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors ml-1 border border-gray-200"
            >
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          </div>
        </div>
      </div>
      <InstallBanner />
    </nav>
  );
}
