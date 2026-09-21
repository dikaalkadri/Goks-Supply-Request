'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, FileText, Package, Building2,
  Settings, LogOut, Menu, X, ShoppingCart
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/admin/requests',  label: 'Permintaan',     icon: FileText },
  { href: '/admin/items',     label: 'Master Barang',  icon: Package },
  { href: '/admin/outlets',   label: 'Outlet',         icon: Building2 },
  { href: '/admin/settings',  label: 'Pengaturan',     icon: Settings },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-60 bg-slate-900 text-white fixed h-full">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">Goks! Supply Request</p>
              <p className="text-xs text-gray-400">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                pathname.startsWith(href)
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-red-600/20 w-full transition-all"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-300 w-full transition-all mt-0.5"
          >
            <ShoppingCart className="h-4 w-4" />
            Lihat Halaman Publik
          </Link>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-slate-900 text-white">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-sm">Admin Panel</span>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1.5 hover:bg-white/10 rounded-lg">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-white/10 p-3 space-y-0.5">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  pathname.startsWith(href)
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-600/20 w-full transition-all"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:ml-60 pt-14 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
