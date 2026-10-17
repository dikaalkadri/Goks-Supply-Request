import { cn } from '@/lib/utils/cn';

interface AdminPageProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Buttons/filters shown on the right of the title (below it on phones) */
  actions?: React.ReactNode;
  /** Small element above the title, e.g. a back link */
  breadcrumb?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Shared frame for every admin page: full-width content with the same padding
 * and header layout,
 * so all menus line up. Use inside <AdminLayout>.
 */
export default function AdminPage({ title, subtitle, actions, breadcrumb, children, className }: AdminPageProps) {
  return (
    <div className={cn('w-full px-4 py-5 sm:px-6 sm:py-6 lg:px-8', className)}>
      {breadcrumb && <div className="mb-3">{breadcrumb}</div>}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

/** Standard header cell + header row classes for admin tables. */
export const adminTh = 'px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide';
export const adminTheadRow = 'bg-gray-50 border-b border-gray-100';
