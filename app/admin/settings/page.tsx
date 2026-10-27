'use client';

import { useState } from 'react';
import { Lock, RefreshCw, Save } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminPage from '@/components/admin/AdminPage';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';

export default function AdminSettingsPage() {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleSyncStatus = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/requests/sync-status', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.updated === 0) {
        toast.success('Semua status permintaan sudah sinkron.');
      } else {
        toast.success(`${data.updated} permintaan berhasil diperbarui statusnya.`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyinkronkan status.');
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin !== confirmPin) {
      toast.error('PIN baru dan konfirmasi PIN tidak cocok.');
      return;
    }
    if (newPin.length < 4) {
      toast.error('PIN baru minimal 4 karakter.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_pin: currentPin, new_pin: newPin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('PIN berhasil diperbarui.');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (err: any) {
      toast.error(err.message || 'Gagal memperbarui PIN.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <AdminPage title="Pengaturan" subtitle="Konfigurasi sistem admin.">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-2xl">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5 text-gray-400" /> Ganti PIN Admin
          </h2>
          <form onSubmit={handleUpdatePin} className="space-y-4 max-w-sm">
            <Input
              type="password"
              label="PIN Saat Ini"
              required
              value={currentPin}
              onChange={e => setCurrentPin(e.target.value)}
              placeholder="••••••"
            />
            <Input
              type="password"
              label="PIN Baru"
              required
              value={newPin}
              onChange={e => setNewPin(e.target.value)}
              placeholder="Minimal 4 karakter"
            />
            <Input
              type="password"
              label="Konfirmasi PIN Baru"
              required
              value={confirmPin}
              onChange={e => setConfirmPin(e.target.value)}
              placeholder="Ketik ulang PIN baru"
            />
            <div className="pt-2">
              <Button type="submit" variant="primary" fullWidth loading={saving}>
                <Save className="h-4 w-4" /> Perbarui PIN
              </Button>
            </div>
          </form>
        </div>

        {/* Sync Status Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-2xl">
          <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-gray-400" /> Sinkronisasi Status Permintaan
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Perbarui status permintaan lama yang belum ter-update secara otomatis.
            Aman untuk dijalankan berulang kali.
          </p>
          <Button
            type="button"
            variant="secondary"
            loading={syncing}
            onClick={handleSyncStatus}
            id="btn-sync-request-status"
          >
            <RefreshCw className="h-4 w-4" />
            {syncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
          </Button>
        </div>
      </AdminPage>
    </AdminLayout>
  );
}
