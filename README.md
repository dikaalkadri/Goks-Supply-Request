# Sistem Permintaan & Pembelian Barang

Aplikasi web untuk manajemen permintaan barang outlet. Dibangun dengan Next.js, Tailwind CSS, dan Supabase.

## 🚀 Setup & Instalasi

### 1. Supabase Setup
1. Buat project baru di [Supabase](https://supabase.com).
2. Pergi ke menu **SQL Editor** di Supabase Dashboard.
3. Buka file di folder `database/` dan jalankan script SQL secara berurutan:
   - `schema.sql` (Membuat tabel, index, dan trigger)
   - `rls.sql` (Mengamankan akses database)
   - `seed.sql` (Menambahkan data awal outlet, master barang, dan PIN default admin)
4. Pergi ke menu **Storage** dan buat dua bucket (Public):
   - `request-condition-photos`
   - `request-receipts`

### 2. Environment Variables
1. Copy file `.env.example` menjadi `.env.local`
2. Isi nilai dari Supabase Dashboard (Project Settings > API):
```
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]
```

**Penting:** JANGAN pernah expose `SUPABASE_SERVICE_ROLE_KEY` ke publik/browser.

### 3. Menjalankan Aplikasi
```bash
npm install
npm run dev
```
Aplikasi akan berjalan di `http://localhost:3000`.

---

## 🔒 Manajemen Admin

- **URL Login Admin:** `http://localhost:3000/admin`
- **PIN Default:** `123456`
- **Wajib Dilakukan:** Segera login menggunakan PIN default, masuk ke menu **Pengaturan**, dan ubah PIN admin Anda.

---

## 🚢 Deployment ke Vercel

1. Push repository ini ke GitHub/GitLab.
2. Import project di [Vercel](https://vercel.com).
3. Pada halaman konfigurasi Vercel, tambahkan Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Klik **Deploy**.
