# Goks! Supply Request

Aplikasi web untuk mengajukan, memproses, dan memantau permintaan barang dari outlet Goks!. Crew outlet mengajukan barang yang dibutuhkan, admin memprosesnya (dikirim dari warehouse atau dibeli dengan petty cash), dan outlet bisa memantau statusnya, termasuk lewat notifikasi di HP.

Dibangun dengan **Next.js 16** (App Router), **React 19**, **Tailwind CSS 4**, dan **Supabase** (Postgres + Storage). Bisa dipasang sebagai aplikasi (PWA).

---

## Daftar Isi

1. [Pengguna & Hak Akses](#pengguna--hak-akses)
2. [Fitur](#fitur)
3. [Alur Status Permintaan](#alur-status-permintaan)
4. [Arsitektur](#arsitektur)
5. [Database](#database)
6. [Setup & Instalasi](#setup--instalasi)
7. [Environment Variables](#environment-variables)
8. [Deployment ke Vercel](#deployment-ke-vercel)
9. [PWA & Notifikasi](#pwa--notifikasi)
10. [Pemeliharaan (Maintenance)](#pemeliharaan-maintenance)
11. [Keamanan](#keamanan)
12. [Catatan & Batasan](#catatan--batasan)

---

## Pengguna & Hak Akses

| Peran | Cara masuk | Yang bisa dilakukan |
|---|---|---|
| **Crew (publik)** | Tanpa login | Mengajukan permintaan, melihat **semua** permintaan dari semua outlet, mengunggah foto barang & nota. |
| **Outlet (user)** | `/login` dengan username & password outlet | Sama seperti publik, tetapi daftar & detail permintaan **hanya untuk outletnya sendiri**, dan pilihan outlet di form terkunci. |
| **Admin** | `/admin` dengan PIN | Seluruh panel admin: memproses permintaan, master data, akun outlet, laporan. |

> Login outlet bersifat **opsional**. Sistem tetap berjalan penuh dalam mode publik; login hanya membatasi tampilan ke outlet yang bersangkutan.

---

## Fitur

### Sisi Crew / Outlet

- **Form permintaan** (`/`): pilih outlet, nama pengaju, catatan, dan daftar barang.
  - Barang dari **master barang** atau **barang lainnya** (manual, isi nama & satuan sendiri).
  - **Foto opsional per barang** (dikompres di browser sebelum diunggah).
- **Daftar permintaan** (`/requests`): pencarian kode/nama pengaju, filter tanggal (default hari ini), status, pembelian, dan outlet.
  - Tab **Semua / Permintaan Saya** (permintaan yang dikirim dari browser ini).
  - Filter outlet diingat browser.
- **Detail permintaan** (`/requests/[id]`): status per barang, catatan admin, foto barang, nota, tanggal pengiriman.
  - Selama status masih **Menunggu**, pengaju dapat mengubah barang dan catatan.
- **Login outlet** (`/login`): username tanpa nomor urut (contoh `TAPLAU`, bukan `01. TAPLAU`), tidak membedakan huruf besar/kecil.
- **PWA**: bisa dipasang ke layar utama HP, plus **notifikasi** saat admin memproses permintaan.

### Sisi Admin (`/admin`)

| Menu | Fungsi |
|---|---|
| **Dashboard** | Kartu ringkasan (bisa diklik untuk melihat daftar permintaannya), filter tanggal, rekap **Outlet Teraktif** & **Barang Paling Sering Diminta**. |
| **Permintaan** | Daftar + filter lengkap (outlet, status, pembelian, ada foto/nota, tanggal), export Excel, hapus. |
| **Detail Permintaan** | Ubah info umum, status pembelian; per barang: **status**, **catatan admin** (mis. alasan ditolak), **tipe** (Warehouse/Petty Cash), **tanggal pengiriman**; tambah/hapus barang; **Riwayat Perubahan**. |
| **Distribusi Barang** | Cari satu barang lalu lihat distribusinya ke outlet dalam rentang tanggal. |
| **Master Barang** | CRUD barang (nama, satuan, kategori, aktif/nonaktif). |
| **Outlet** | CRUD outlet, **atur urutan dengan tekan-tahan lalu geser** (drag & drop). Urutan ini dipakai di semua dropdown outlet. |
| **Akun Outlet** | Kelola akun login outlet: tambah, buat akun semua outlet sekaligus, ubah username/password, reset password, aktif/nonaktif, buka kunci, hapus. |
| **Pengaturan** | Ganti PIN admin. |

Semua tabel/daftar diberi **nomor urut**; pada daftar berhalaman, nomor berlanjut antarhalaman.

---

## Alur Status Permintaan

```
Crew mengajukan ──► Menunggu ──► admin memberi status tiap barang ──► Selesai
                                   (Selesai / Ditolak per barang)
```

- **Status barang**: `Menunggu` → `Selesai` atau `Ditolak` (diatur admin, bisa diberi catatan).
- **Status permintaan** dihitung otomatis: **Selesai** jika semua barang sudah diberi status (tidak ada yang Menunggu), selain itu **Menunggu**.
- **Tipe barang**: `Warehouse` (dikirim dari gudang) atau `Petty Cash` (dibeli outlet).
  - Saat **nota pertama** sebuah barang diunggah, tanggal pengiriman terisi otomatis; untuk barang **Petty Cash** statusnya otomatis menjadi **Selesai**.
- **Status pembelian** permintaan: `Belum Dibeli` / `Sudah Dibeli` (diatur admin).
- Setiap perubahan oleh admin **dicatat di Riwayat Perubahan** dan **dikirim sebagai notifikasi** ke perangkat outlet.

---

## Arsitektur

```
Browser (crew / outlet / admin)
   │  fetch JSON
   ▼
Next.js Route Handlers  (app/api/**)  ──►  Supabase Postgres  (tabel + RLS)
   │                                   ──►  Supabase Storage   (foto & nota)
   └─ after() ──► web-push ──► layanan push browser ──► Service Worker (public/sw.js) ──► notifikasi
```

- Semua akses data lewat **API route di server**. Operasi sensitif memakai **service role** (`createAdminClient`), sehingga RLS di database cukup memblokir akses langsung dari browser.
- File diunggah langsung dari browser ke Supabase Storage memakai **signed upload URL** dari server.
- `proxy.ts` (pengganti middleware di Next 16) melindungi `/admin/*` dan `/api/admin/*`.

### Struktur folder

```
app/
  page.tsx                  Form permintaan
  requests/                 Daftar & detail permintaan (publik / outlet)
  login/                    Login outlet
  admin/                    Panel admin (dashboard, requests, distribution, items, outlets, users, settings)
  api/
    requests/, items/, outlets/, upload/   API publik
    auth/                   Login/logout/me akun outlet
    push/                   Langganan & follow notifikasi
    admin/                  API admin (dilindungi proxy)
  manifest.ts               Web App Manifest (PWA)
components/
  ui/                       Komponen dasar (Button, Input, Modal, Select, DateRangePicker, …)
  layout/PublicNav.tsx      Navigasi publik (login, lonceng notifikasi, banner pasang aplikasi)
  admin/AdminLayout.tsx     Layout & menu admin
  pwa/                      Registrasi service worker, tombol notifikasi, banner install
lib/
  auth/                     Sesi admin (PIN) & sesi outlet, penandatanganan cookie
  push/                     Kirim notifikasi (server) & berlangganan (client)
  supabase/                 Klien Supabase (anon & service role)
  utils/                    Kode request, log riwayat, filter query, urutan outlet, format, kompres gambar
database/                   schema.sql, rls.sql, seed, dan file migrasi
public/
  sw.js                     Service worker (notifikasi)
  icon-*.png, badge-96.png  Ikon PWA & notifikasi
proxy.ts                    Proteksi route admin
```

---

## Database

| Tabel | Isi |
|---|---|
| `outlets` | Daftar outlet, status aktif, `sort_order` (urutan tampil). |
| `items` | Master barang. |
| `requests` | Header permintaan: kode `REQ-YYMMDD-XXX`, outlet, pengaju, catatan, status, status pembelian, `edit_token`. |
| `request_items` | Barang per permintaan: nama/satuan/qty, master/manual, `status`, `admin_note`, `purchase_type`, `photo_path`, `receipt_path`, `delivered_at`. |
| `request_photos`, `purchase_receipts` | Foto kondisi & nota tingkat permintaan (fitur lama, data lama tetap ditampilkan). |
| `request_logs` | Riwayat perubahan (dibuat/diubah/dihapus, oleh siapa, apa yang berubah). |
| `outlet_users` | Akun login outlet (hash bcrypt, status aktif, kunci login, versi sesi). |
| `push_subscriptions`, `push_follows` | Perangkat yang berlangganan notifikasi & permintaan yang diikutinya. |
| `settings` | Hash PIN admin. |

**Storage buckets** (public): `request-condition-photos` (foto barang) dan `request-receipts` (nota).

---

## Setup & Instalasi

### 1. Supabase

1. Buat project di [Supabase](https://supabase.com).
2. Di **SQL Editor**, jalankan berurutan:
   1. `database/schema.sql` — tabel, index, trigger.
   2. `database/rls.sql` — Row Level Security.
   3. File migrasi, **urut seperti ini**:

      | # | File | Menambahkan |
      |---|---|---|
      | 1 | `migration_request_item_photo.sql` | Foto per barang |
      | 2 | `migration_request_item_status.sql` | Status per barang |
      | 3 | `migration_admin_notes_and_logs.sql` | Catatan admin & riwayat perubahan |
      | 4 | `migration_request_item_purchase_type.sql` | Tipe Warehouse / Petty Cash |
      | 5 | `migration_request_item_delivered_at.sql` | Tanggal pengiriman |
      | 6 | `migration_request_item_receipt_path.sql` | Nota per barang |
      | 7 | `migration_outlet_users.sql` | Akun login outlet (+ buat akun untuk semua outlet) |
      | 8 | `migration_outlet_users_strip_number.sql` | Username tanpa nomor urut |
      | 9 | `migration_outlet_sort_order.sql` | Urutan outlet |
      | 10 | `migration_push_notifications.sql` | Notifikasi push |

      > **Instalasi baru** tidak perlu menjalankan migrasi 1–6 dan 9–10 karena kolom/tabelnya sudah ada di `schema.sql`; cukup jalankan migrasi 7 (dan 8) setelah outlet terisi untuk membuat akun outlet. Semua migrasi aman dijalankan ulang. Untuk **database lama**, jalankan migrasi yang belum pernah dijalankan sesuai urutan.
   4. `database/seed.sql` — contoh outlet, master barang, dan PIN admin default; atau `seed_outlets.sql` untuk daftar outlet Goks! yang sebenarnya.
3. Di **Storage**, buat dua bucket **Public**: `request-condition-photos` dan `request-receipts`.

### 2. Environment & menjalankan

```bash
cp .env.example .env.local   # lalu isi nilainya (lihat tabel di bawah)
npm install
npm run dev                  # http://localhost:3000
```

Perintah lain: `npm run build`, `npm run start`, `npm run lint`.

---

## Environment Variables

| Variabel | Wajib | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Ya | URL project Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Ya | Publishable/anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Ya | Secret/service role key. **Rahasia, hanya di server.** |
| `ADMIN_SESSION_SECRET` | Disarankan | Kunci penanda tangan cookie sesi admin & outlet (acak, ≥ 32 karakter). Jika kosong memakai service role key. Mengganti nilainya mengeluarkan semua sesi. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Untuk notifikasi | Kunci publik Web Push. |
| `VAPID_PRIVATE_KEY` | Untuk notifikasi | Kunci privat Web Push. **Rahasia.** |
| `VAPID_SUBJECT` | Untuk notifikasi | Kontak untuk layanan push: URL `https://…` situs atau `mailto:…`. |

Membuat nilai baru:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # ADMIN_SESSION_SECRET
npx web-push generate-vapid-keys                                          # pasangan kunci VAPID
```

Tanpa variabel VAPID, aplikasi tetap berjalan; hanya tombol notifikasi yang tidak muncul.

---

## Deployment ke Vercel

1. Push repository ke GitHub, lalu import di [Vercel](https://vercel.com).
2. Isi semua [Environment Variables](#environment-variables) di **Project Settings → Environment Variables** (gunakan `ADMIN_SESSION_SECRET` yang berbeda dari lokal).
3. Deploy. Setiap perubahan environment variable butuh **redeploy**.
4. Jalankan migrasi database yang baru (jika ada) di Supabase **sebelum atau bersamaan** dengan deploy.

---

## PWA & Notifikasi

### Memasang aplikasi

- **Android / Chrome / Edge**: banner **"Pasang aplikasi"** muncul di halaman publik → tombol **Pasang**.
- **iPhone / iPad**: buka di Safari → tombol **Bagikan** → **Tambah ke Layar Utama**.
- Aplikasi terpasang membuka **Daftar Permintaan** dalam mode layar penuh.

### Notifikasi status

Notifikasi dikirim saat admin mengubah status permintaan/barang, status pembelian, catatan barang, tipe barang, tanggal pengiriman, atau menambah/menghapus barang. Mengetuk notifikasi membuka detail permintaan.

| Perangkat | Menerima notifikasi untuk |
|---|---|
| Login sebagai outlet | **Semua** permintaan outlet tersebut. |
| Tanpa login | Permintaan yang **dikirim dari perangkat itu**. |

Cara mengaktifkan: tombol **lonceng 🔔** di navigasi, atau **"Aktifkan Notifikasi"** setelah mengirim permintaan.

Syarat & batasan:
- Hanya lewat **HTTPS** (situs Vercel). Di komputer, `localhost` juga bisa.
- **iOS 16.4+** dan **wajib dipasang ke Layar Utama** terlebih dahulu (aturan Apple).
- Jika izin notifikasi pernah diblokir, aktifkan kembali dari pengaturan browser.
- Langganan yang sudah tidak berlaku (aplikasi dihapus, izin dicabut) dibersihkan otomatis saat pengiriman.

---

## Pemeliharaan (Maintenance)

### Admin
- URL: `/admin`. **PIN default `123456` — segera ganti** di **Pengaturan**.

### Akun outlet (menu **Akun Outlet**)
- Username awal = nama outlet tanpa nomor urut (`01. TAPLAU` → `TAPLAU`), password awal **`12345678`**.
- **Outlet baru**: tambahkan di menu Outlet, lalu klik **Buat Akun Semua Outlet** (atau **Tambah Akun**).
- **Lupa password**: ikon kunci → reset ke `12345678`.
- **Akun terkunci** (5× salah password → terkunci 5 menit): tunggu, atau klik ikon gembok untuk membuka.
- **Ganti password / nonaktifkan akun** langsung mengeluarkan akun dari semua perangkat.
- **Rename outlet tidak mengubah username** — ubah manual bila perlu.
- Sebaiknya ganti password tiap outlet dari default agar outlet tidak bisa masuk sebagai outlet lain.

### Data
- **Salah pilih outlet** pada permintaan: ubah outlet di detail permintaan admin; permintaan otomatis pindah ke akun outlet yang benar.
- **Urutan outlet**: menu Outlet → tekan-tahan baris → geser.

---

## Keamanan

- **Cookie sesi** admin & outlet ditandatangani HMAC-SHA256 dan memiliki masa berlaku (admin 24 jam, outlet 7 hari). Cookie palsu ditolak.
- Sesi outlet diperiksa ke database setiap request: akun nonaktif, password yang direset, atau outlet nonaktif langsung mengakhiri sesi.
- **Pembatasan outlet dilakukan di server**: saat login, daftar & detail permintaan dibatasi ke outlet sesi, dan outlet pada permintaan baru dipaksa sesuai akun.
- Password outlet & PIN admin disimpan sebagai **hash bcrypt**.
- Tabel sensitif (`settings`, `outlet_users`, `request_logs`, `push_*`) diblokir untuk akses anon lewat RLS; hanya server (service role) yang mengaksesnya.
- `edit_token` permintaan tidak pernah dikirim di API publik.
- Kata kunci pencarian dibersihkan dari karakter khusus filter database.

---

## Catatan & Batasan

- Upload foto/nota per barang dapat dilakukan siapa pun yang membuka halaman permintaan (tanpa token).
- Aplikasi tidak menyimpan halaman untuk offline; koneksi internet diperlukan.
