import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  text?: string;
}

export function LoadingState({ text = 'Memuat...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
      {icon && <div className="text-gray-300 mb-1">{icon}</div>}
      <h3 className="text-base font-semibold text-gray-600">{title}</h3>
      {description && <p className="text-sm text-gray-400 max-w-xs">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
