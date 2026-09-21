'use client';

import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  variant?: 'danger' | 'warning';
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Konfirmasi',
  message,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  loading,
  variant = 'danger',
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="text-center">
        <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
          variant === 'danger' ? 'bg-red-100' : 'bg-yellow-100'
        }`}>
          <AlertTriangle className={`h-6 w-6 ${variant === 'danger' ? 'text-red-600' : 'text-yellow-600'}`} />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant === 'danger' ? 'danger' : 'primary'} fullWidth onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
