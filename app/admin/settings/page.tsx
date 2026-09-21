'use client';

import { useState } from 'react';
import { Lock, Save } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';

export default function AdminSettingsPage() {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);

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
      <div className="p-6 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
          <p className="text-sm text-gray-500 mt-0.5">Konfigurasi sistem admin.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
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
      </div>
    </AdminLayout>
  );
}
