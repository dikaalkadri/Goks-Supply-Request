'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const menus = [
  { href: '/',         label: 'Permintaan Barang', icon: ShoppingCart },
  { href: '/requests', label: 'Daftar Permintaan', icon: ClipboardList },
];

/**
 * Main menu for crew as two large cards (labels stay visible on phones).
 * `onCurrentClick` runs when the card of the current page is tapped, e.g. to
 * reset the request form from its success screen (same URL, so no navigation).
 */
export default function PublicMenuCards({
  className,
  onCurrentClick,
}: {
  className?: string;
  onCurrentClick?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Menu utama" className={cn('grid grid-cols-2 gap-3', className)}>
      {menus.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            onClick={active && onCurrentClick ? (e) => { e.preventDefault(); onCurrentClick(); } : undefined}
            className={cn(
              'flex items-center gap-3 rounded-2xl border p-3 sm:p-4 transition-all',
              active
                ? 'bg-primary-600 border-primary-600 text-white shadow-md shadow-primary-200'
                : 'bg-white border-gray-100 text-gray-900 shadow-sm hover:border-primary-200 hover:shadow-md'
            )}
          >
            <span
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                active ? 'bg-white/20' : 'bg-primary-50 text-primary-600'
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 text-sm font-semibold leading-tight">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
