'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Store, Shield } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useOutletSession, resetOutletSessionCache } from '@/lib/auth/use-outlet-session';

export default function OutletLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { session, loading: sessionLoading } = useOutletSession();

  // If already logged in, redirect to requests
  useEffect(() => {
    if (!sessionLoading && session) {
      router.replace('/requests');
    }
  }, [session, sessionLoading, router]);

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
      window.location.href = '/requests';
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.');
      setLoading(false);
    }
  };

  if (sessionLoading || session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Memeriksa sesi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Navbar Simple */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-gray-900 text-sm">Goks! Supply Request</span>
          </div>
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors border border-gray-200"
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Admin PIN</span>
          </Link>
        </div>
      </header>

      {/* Main Login Form */}
      <main className="max-w-sm w-full mx-auto px-4 py-12 flex-1 flex flex-col justify-center">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm border border-primary-200/60">
            <Store className="h-8 w-8 text-primary-700" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Masuk Outlet</h1>
          <p className="text-sm text-gray-500 mt-1">Silakan masuk menggunakan akun outlet Anda.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <Input
            id="username"
            label="Username Outlet"
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
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
          />

          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

          <Button type="submit" variant="primary" fullWidth size="lg" loading={loading} className="shadow-lg shadow-primary-200">
            {loading ? 'Memeriksa...' : 'Masuk ke Dashboard'}
          </Button>
        </form>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} Goks! Supply Request
      </footer>
    </div>
  );
}
