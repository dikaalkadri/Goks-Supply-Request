import { cn } from '@/lib/utils/cn';
import type { RequestStatus, PurchaseStatus } from '@/types';

interface StatusBadgeProps {
  status: RequestStatus;
  className?: string;
}

interface PurchaseBadgeProps {
  status: PurchaseStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config: Record<RequestStatus, { label: string; classes: string; dot: string }> = {
    pending:    { label: 'Menunggu',  classes: 'bg-yellow-50 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500' },
    processing: { label: 'Diproses', classes: 'bg-blue-50 text-blue-700 border-blue-200',       dot: 'bg-blue-500' },
    completed:  { label: 'Selesai',  classes: 'bg-green-50 text-green-700 border-green-200',    dot: 'bg-green-500' },
    rejected:   { label: 'Ditolak',  classes: 'bg-red-50 text-red-700 border-red-200',          dot: 'bg-red-500' },
  };

  const { label, classes, dot } = config[status] ?? config.pending;

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border', classes, className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />
      {label}
    </span>
  );
}

export function PurchaseStatusBadge({ status, className }: PurchaseBadgeProps) {
  const config: Record<PurchaseStatus, { label: string; classes: string; dot: string }> = {
    not_purchased: { label: 'Belum Dibeli', classes: 'bg-yellow-50 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500' },
    purchased:     { label: 'Sudah Dibeli', classes: 'bg-green-50 text-green-700 border-green-200',    dot: 'bg-green-500' },
  };

  const { label, classes, dot } = config[status] ?? config.not_purchased;

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border', classes, className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />
      {label}
    </span>
  );
}
