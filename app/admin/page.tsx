'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function AdminLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) { setError('Masukkan PIN admin.'); return; }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'PIN tidak valid.');
        setLoading(false);
        return;
      }
      router.push('/admin/dashboard');
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-primary-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-600/20 border border-primary-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 overflow-hidden">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Management</h1>
          <p className="text-gray-400 text-sm mt-1">Goks! Supply Request</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              <Lock className="h-4 w-4 inline mr-1.5" />
              Masukkan PIN Admin
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => { setPin(e.target.value); setError(''); }}
              placeholder="••••••"
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-gray-500 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {error && (
              <p className="mt-2 text-sm text-red-400 text-center font-medium">{error}</p>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            size="lg"
            loading={loading}
          >
            {loading ? 'Memverifikasi...' : 'Masuk'}
          </Button>
        </form>

        <p className="text-center text-gray-500 text-xs mt-6">
          Bukan admin?{' '}
          <a href="/" className="text-primary-400 hover:text-primary-300 transition-colors">
            Kembali ke halaman utama
          </a>
        </p>
      </div>
    </div>
  );
}
