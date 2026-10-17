'use client';

import { useState, useEffect, useMemo } from 'react';
import { Users, Plus, Edit, Trash2, KeyRound, Search, X, Wand2, Unlock, AlertTriangle } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminPage from '@/components/admin/AdminPage';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { LoadingState } from '@/components/ui/States';
import { formatDateTime } from '@/lib/utils/format';
import toast from 'react-hot-toast';

interface OutletUser {
  id: string;
  outlet_id: string;
  username: string;
  is_active: boolean;
  failed_attempts: number;
  locked_until: string | null;
  last_login_at: string | null;
  outlet: { id: string; name: string; is_active: boolean } | null;
}

interface OutletOption {
  id: string;
  name: string;
  is_active: boolean;
}

const isLocked = (u: OutletUser) => Boolean(u.locked_until && new Date(u.locked_until).getTime() > Date.now());

export default function AdminUsersPage() {
  const [users, setUsers] = useState<OutletUser[]>([]);
  const [missingOutlets, setMissingOutlets] = useState<OutletOption[]>([]);
  const [defaultPassword, setDefaultPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Add / edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<OutletUser | null>(null);
  const [formOutletId, setFormOutletId] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Confirmations
  const [resetTarget, setResetTarget] = useState<OutletUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OutletUser | null>(null);
  const [confirmGenerate, setConfirmGenerate] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const json = await res.json();
      if (!res.ok) {
        setLoadError(json.error || 'Gagal memuat akun.');
        return;
      }
      setLoadError(null);
      setUsers(json.data ?? []);
      setMissingOutlets(json.outlets_without_account ?? []);
      setDefaultPassword(json.default_password ?? '');
    } catch {
      setLoadError('Gagal memuat akun.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      u.username.toLowerCase().includes(q) || (u.outlet?.name ?? '').toLowerCase().includes(q)
    );
  }, [users, search]);

  const openAdd = () => {
    setEditUser(null);
    setFormOutletId(missingOutlets[0]?.id ?? '');
    setFormUsername('');
    setFormPassword('');
    setFormActive(true);
    setModalOpen(true);
  };

  const openEdit = (u: OutletUser) => {
    setEditUser(u);
    setFormUsername(u.username);
    setFormPassword('');
    setFormActive(u.is_active);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formPassword && formPassword.length < 6) {
      toast.error('Password minimal 6 karakter.');
      return;
    }
    setSaving(true);
    try {
      let res: Response;
      if (editUser) {
        const body: Record<string, unknown> = {};
        if (formUsername.trim() !== editUser.username) body.username = formUsername.trim();
        if (formPassword) body.password = formPassword;
        if (formActive !== editUser.is_active) body.is_active = formActive;
        if (Object.keys(body).length === 0) {
          setModalOpen(false);
          return;
        }
        res = await fetch(`/api/admin/users/${editUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        if (!formOutletId) {
          toast.error('Pilih outlet.');
          return;
        }
        res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            outlet_id: formOutletId,
            username: formUsername.trim() || undefined,
            password: formPassword || undefined,
          }),
        });
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan akun.');
      toast.success(editUser ? 'Akun diperbarui.' : 'Akun dibuat.');
      setModalOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan akun.');
    } finally {
      setSaving(false);
    }
  };

  const patchUser = async (u: OutletUser, body: Record<string, unknown>, successMsg: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal memperbarui akun.');
      toast.success(successMsg);
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui akun.');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (!resetTarget) return;
    await patchUser(resetTarget, { reset_password: true }, `Password ${resetTarget.username} direset ke default.`);
    setResetTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menghapus akun.');
      toast.success('Akun dihapus.');
      setDeleteTarget(null);
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus akun.');
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generate_missing: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal membuat akun.');
      toast.success(`${json.data?.created ?? 0} akun dibuat.`);
      setConfirmGenerate(false);
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat akun.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout>
      <AdminPage
        title="Akun Outlet"
        subtitle="Akun login untuk outlet. Outlet yang login hanya melihat permintaannya sendiri."
        actions={!loadError && (
          <>
            {missingOutlets.length > 0 && (
              <Button variant="secondary" onClick={() => setConfirmGenerate(true)}>
                <Wand2 className="h-4 w-4" /> Buat Akun Semua Outlet ({missingOutlets.length})
              </Button>
            )}
            <Button onClick={openAdd} disabled={missingOutlets.length === 0}>
              <Plus className="h-4 w-4" /> Tambah Akun
            </Button>
          </>
        )}
      >

        {loadError ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800 flex gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{loadError}</p>
              <p className="mt-1">Setelah migrasi dijalankan, muat ulang halaman ini.</p>
            </div>
          </div>
        ) : (
          <>
            {defaultPassword && (
              <p className="text-xs text-gray-500 mb-3">
                Password default akun baru dan hasil reset: <code className="bg-gray-100 px-1.5 py-0.5 rounded font-semibold text-gray-700">{defaultPassword}</code>
              </p>
            )}

            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5 mb-4 max-w-sm">
              <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Cari username atau outlet..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm focus:outline-none text-gray-700 placeholder:text-gray-400"
              />
              {search && (
                <button onClick={() => setSearch('')} aria-label="Hapus pencarian">
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {loading ? (
                <LoadingState />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="pl-4 pr-2 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right w-12">No</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Username</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Outlet</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Status</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Login Terakhir</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-gray-500">
                            {users.length === 0 ? 'Belum ada akun outlet.' : 'Tidak ada akun yang cocok.'}
                          </td>
                        </tr>
                      ) : (
                        filtered.map((u, i) => (
                          <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                            <td className="pl-4 pr-2 py-3 text-right text-gray-400 tabular-nums">{i + 1}</td>
                            <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                              <span className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-gray-400" /> {u.username}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                              {u.outlet?.name ?? '-'}
                              {u.outlet && !u.outlet.is_active && (
                                <span className="ml-1.5 text-xs text-gray-400">(outlet nonaktif)</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              {isLocked(u) ? (
                                <span className="text-xs px-2 py-1 rounded-full font-medium bg-amber-100 text-amber-700">Terkunci</span>
                              ) : (
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                  {u.is_active ? 'Aktif' : 'Nonaktif'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                              {u.last_login_at ? formatDateTime(u.last_login_at) : 'Belum pernah'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {isLocked(u) && (
                                  <button
                                    onClick={() => patchUser(u, { unlock: true }, `${u.username} dibuka kuncinya.`)}
                                    disabled={busy}
                                    className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                    title="Buka kunci"
                                  >
                                    <Unlock className="h-4 w-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => openEdit(u)}
                                  className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setResetTarget(u)}
                                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Reset password ke default"
                                >
                                  <KeyRound className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteTarget(u)}
                                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Hapus"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </AdminPage>

      {/* Add / Edit Modal */}
      <Modal open={modalOpen} onClose={() => !saving && setModalOpen(false)} title={editUser ? 'Edit Akun' : 'Tambah Akun'}>
        <form onSubmit={handleSave} className="space-y-4">
          {editUser ? (
            <div>
              <p className="block text-sm font-semibold text-gray-700 mb-1.5">Outlet</p>
              <p className="text-sm text-gray-900">{editUser.outlet?.name ?? '-'}</p>
            </div>
          ) : (
            <div>
              <label htmlFor="user-outlet" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Outlet<span className="text-red-500 ml-1">*</span>
              </label>
              <select
                id="user-outlet"
                value={formOutletId}
                onChange={(e) => setFormOutletId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {missingOutlets.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}{o.is_active ? '' : ' (nonaktif)'}</option>
                ))}
              </select>
            </div>
          )}

          <Input
            label="Username"
            value={formUsername}
            onChange={(e) => setFormUsername(e.target.value)}
            placeholder={editUser ? '' : 'Kosongkan = nama outlet tanpa nomor (mis. TAPLAU)'}
            required={Boolean(editUser)}
          />
          <Input
            label={editUser ? 'Password Baru' : 'Password'}
            type="password"
            autoComplete="new-password"
            value={formPassword}
            onChange={(e) => setFormPassword(e.target.value)}
            placeholder={editUser ? 'Kosongkan jika tidak diganti' : `Kosongkan = ${defaultPassword || 'default'}`}
            hint={editUser ? 'Mengganti password akan mengeluarkan akun ini dari semua perangkat.' : 'Minimal 6 karakter.'}
          />

          {editUser && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
              <input
                type="checkbox"
                id="user-active"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded"
              />
              <label htmlFor="user-active" className="text-sm font-medium text-gray-700">Akun Aktif</label>
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <Button type="button" variant="secondary" fullWidth onClick={() => setModalOpen(false)} disabled={saving}>Batal</Button>
            <Button type="submit" variant="primary" fullWidth loading={saving}>Simpan</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(resetTarget)}
        onClose={() => !busy && setResetTarget(null)}
        onConfirm={handleReset}
        loading={busy}
        variant="warning"
        title="Reset Password"
        message={`Password "${resetTarget?.username}" akan direset ke ${defaultPassword}. Akun ini akan keluar dari semua perangkat.`}
        confirmLabel="Reset"
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => !busy && setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={busy}
        title="Hapus Akun"
        message={`Hapus akun "${deleteTarget?.username}"? Outlet tetap bisa memakai sistem tanpa login. Data permintaan tidak terhapus.`}
        confirmLabel="Hapus"
      />

      <ConfirmDialog
        open={confirmGenerate}
        onClose={() => !busy && setConfirmGenerate(false)}
        onConfirm={handleGenerate}
        loading={busy}
        variant="warning"
        title="Buat Akun Semua Outlet"
        message={`Buat ${missingOutlets.length} akun untuk outlet yang belum punya akun. Username = nama outlet tanpa nomor (mis. TAPLAU), password = ${defaultPassword}.`}
        confirmLabel="Buat Akun"
      />
    </AdminLayout>
  );
}
