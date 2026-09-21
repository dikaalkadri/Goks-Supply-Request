'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, List, Shield } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const navItems = [
  { href: '/',         label: 'Permintaan Barang', icon: ShoppingCart },
  { href: '/requests', label: 'Daftar Permintaan',  icon: List },
];

export default function PublicNav() {
  const pathname = usePathname();

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
    </nav>
  );
}
