'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Store } from 'lucide-react';
import PublicNav from '@/components/layout/PublicNav';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { resetOutletSessionCache } from '@/lib/auth/use-outlet-session';

export default function OutletLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Username dan password wajib diisi.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal masuk.');
        setLoading(false);
        return;
      }
      resetOutletSessionCache();
      // Full navigation so every component re-reads the new session
      window.location.href = '/requests';
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNav />
      <main className="max-w-sm mx-auto px-4 py-12">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Store className="h-7 w-7 text-primary-700" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Masuk Outlet</h1>
          <p className="text-sm text-gray-500 mt-1">Lihat dan kelola permintaan barang outlet Anda.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <Input
            id="username"
            label="Username"
            placeholder="Contoh: TAPLAU"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(''); }}
          />
          <Input
            id="password"
            type="password"
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
          />

          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

          <Button type="submit" variant="primary" fullWidth size="lg" loading={loading}>
            {loading ? 'Memeriksa...' : 'Masuk'}
          </Button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-4">
          Tanpa login Anda tetap bisa{' '}
          <Link href="/" className="text-primary-700 font-medium hover:underline">membuat permintaan</Link>
          {' '}seperti biasa.
        </p>
      </main>
    </div>
  );
}
